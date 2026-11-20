import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'backend.dart';
import 'counter_view.dart';
import 'printer/print_server.dart';
import 'receipt/escpos_parser.dart';
import 'receipt/receipt_reader.dart';

// QriousQR Counter: the counter display (pairing, order QR, pickup board), drawn natively,
// plus a network receipt printer on port 9100, so a POS on the same Wi-Fi can "print"
// to it. The order number is read from the receipt and the order appears on screen.

const defaultBaseUrl = 'https://qriousqr.com';
const brandOrange = Color(0xFFFF5722);
const _tokenKey = 'device_token';
const _pollEvery = Duration(seconds: 3);
const _freshFor = Duration(seconds: 15);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CounterApp());
}

class CounterApp extends StatelessWidget {
  const CounterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QriousQR Counter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: brandOrange, useMaterial3: true),
      home: const CounterHome(),
    );
  }
}

class LastReceipt {
  final DateTime at;
  final String? orderNumber;
  final String excerpt;
  final bool fromImage;
  final String? error;
  LastReceipt(this.at, this.orderNumber, this.excerpt, this.fromImage, this.error);
}

class CounterHome extends StatefulWidget {
  const CounterHome({super.key});

  @override
  State<CounterHome> createState() => _CounterHomeState();
}

class _CounterHomeState extends State<CounterHome> {
  late final PrintServer _printer;
  final _reader = ReceiptReader();

  bool _loaded = false;
  String _baseUrl = defaultBaseUrl;
  String? _token;
  Map<String, dynamic>? _state;
  bool _offline = false;
  final Map<String, DateTime> _readySeen = {}; // qr_token -> first time seen ready

  String? _ip;
  String? _printerError;
  LastReceipt? _last;
  String? _banner;
  Timer? _bannerTimer;
  Timer? _ipTimer;
  Timer? _pollTimer;
  bool _polling = false;
  final List<Uint8List> _queue = [];
  bool _processing = false;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _printer = PrintServer(onJob: (job, _) {
      _queue.add(job);
      _drainQueue();
    });
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('base_url') ?? defaultBaseUrl;
    final t = prefs.getString(_tokenKey);
    setState(() {
      _token = t != null && t.startsWith('qdsp_') ? t : null;
      _loaded = true;
    });
    _pollTimer = Timer.periodic(_pollEvery, (_) => _poll());
    _poll();
    await _startPrinter();
    await _refreshIp();
    // Wi-Fi address can change (DHCP); keep the shown address current
    _ipTimer = Timer.periodic(const Duration(minutes: 1), (_) => _refreshIp());
  }

  // ---------- Display state ----------

  Future<void> _poll() async {
    final token = _token;
    if (token == null || _polling) return;
    _polling = true;
    try {
      final s = await displayState(token);
      if (!mounted || token != _token) return;
      final now = DateTime.now();
      final readyTokens = <String>{};
      for (final o in (s['orders'] as List? ?? [])) {
        if (o is Map && o['status'] == 'ready') readyTokens.add('${o['qr_token']}');
      }
      _readySeen.removeWhere((k, _) => !readyTokens.contains(k));
      // Orders already ready when the screen first loads are not "fresh"
      final firstLoad = _state == null;
      for (final k in readyTokens) {
        _readySeen.putIfAbsent(k, () => firstLoad ? now.subtract(_freshFor) : now);
      }
      setState(() {
        _state = s;
        _offline = false;
      });
    } on DisplayRevoked {
      await _clearToken();
    } catch (_) {
      if (mounted) setState(() => _offline = true); // network blip: keep showing the last screen
    } finally {
      _polling = false;
    }
  }

  Future<void> _clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    if (!mounted) return;
    setState(() {
      _token = null;
      _state = null;
      _readySeen.clear();
    });
  }

  Future<String?> _pair(String code) async {
    try {
      final token = await pairDisplay(code);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      setState(() => _token = token);
      _poll();
      return null;
    } catch (e) {
      return '$e'.toLowerCase().contains('rate_limited')
          ? 'Too many attempts. Wait a minute and try again.'
          : 'That code is wrong or expired. Create a new one in the Dashboard.';
    }
  }

  // ---------- Printer ----------

  Future<void> _startPrinter() async {
    try {
      await _printer.start();
      if (mounted) setState(() => _printerError = null);
    } catch (e) {
      if (mounted) setState(() => _printerError = 'Could not start the printer on port 9100: $e');
    }
  }

  Future<void> _refreshIp() async {
    final ip = await localIpAddress();
    if (mounted && ip != _ip) setState(() => _ip = ip);
  }

  // Process print jobs one at a time, in order
  Future<void> _drainQueue() async {
    if (_processing) return;
    _processing = true;
    while (_queue.isNotEmpty) {
      await _handleJob(_queue.removeAt(0));
    }
    _processing = false;
  }

  Future<void> _handleJob(Uint8List job) async {
    if (isEmptyJob(job)) return; // status check / init only: nothing was printed
    final token = _token;
    if (token == null) {
      _record(LastReceipt(DateTime.now(), null, '', false, 'This display is not paired yet. Pair it first.'));
      _showBanner('🖨 Receipt received, but this display is not paired yet');
      return;
    }
    try {
      String? label;
      try {
        label = await fetchReceiptLabel(token);
      } catch (_) {}
      final result = await _reader.read(job, customLabel: label);
      if (result == null) return;
      final resp = await ingestReceipt(
        deviceToken: token,
        orderNumber: result.orderNumber,
        excerpt: result.excerpt,
        printerIp: _ip,
      );
      _record(LastReceipt(DateTime.now(), result.orderNumber, result.excerpt, result.fromImage, null));
      if (resp['ok'] == true) {
        _showBanner('🖨 Order #${resp['order_number']} received');
        _poll(); // show it right away instead of waiting for the next poll
      } else {
        _showBanner('🖨 Receipt received, but no order number was found');
      }
    } on DisplayRevoked {
      await _clearToken();
    } catch (e) {
      _record(LastReceipt(DateTime.now(), null, '', false, '$e'));
      _showBanner('🖨 Receipt could not be processed');
    }
  }

  void _record(LastReceipt r) {
    if (mounted) setState(() => _last = r);
  }

  void _showBanner(String text) {
    if (!mounted) return;
    _bannerTimer?.cancel();
    setState(() => _banner = text);
    _bannerTimer = Timer(const Duration(seconds: 4), () {
      if (mounted) setState(() => _banner = null);
    });
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _ipTimer?.cancel();
    _pollTimer?.cancel();
    _printer.stop();
    _reader.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  // ---------- UI ----------

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (!_loaded) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_token == null) {
      body = PairingView(onPair: _pair);
    } else if (_state == null) {
      body = Center(
        child: Text(_offline ? 'Connecting… check the Wi-Fi' : 'Loading…',
            style: const TextStyle(fontSize: 18, color: Colors.black54)),
      );
    } else {
      final now = DateTime.now();
      final fresh = {
        for (final e in _readySeen.entries)
          if (now.difference(e.value) < _freshFor) e.key,
      };
      body = CounterView(
        state: _state!,
        baseUrl: _baseUrl,
        freshReady: fresh,
        offline: _offline,
        onMenu: _openPanel,
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F5),
      body: Stack(
        children: [
          Positioned.fill(child: SafeArea(child: body)),
          if (_banner != null)
            Positioned(
              top: 12,
              left: 0,
              right: 0,
              child: Center(
                child: Material(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    child: Text(_banner!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                ),
              ),
            ),
          // Small staff button: printer status and setup details
          Positioned(
            left: 10,
            bottom: 10,
            child: Opacity(
              opacity: 0.55,
              child: FloatingActionButton.small(
                heroTag: 'printer',
                backgroundColor: _printerError != null ? Colors.red : Colors.white,
                onPressed: _openPanel,
                tooltip: 'Printer setup',
                child: const Icon(Icons.print),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openPanel() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        final last = _last;
        final displayName = _state?['display_name'];
        return Padding(
          padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.of(ctx).viewInsets.bottom),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Printer mode', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                if (_printerError != null)
                  Text(_printerError!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600))
                else ...[
                  const Text('This tablet works as a network receipt printer. In your POS, add a printer with:'),
                  const SizedBox(height: 12),
                  _infoRow('Printer type', 'Network / Ethernet, ESC/POS (Epson-compatible)'),
                  _infoRow('IP address', _ip ?? 'Not connected to Wi-Fi'),
                  _infoRow('Port', '9100'),
                  const SizedBox(height: 6),
                  const Text(
                    'Tip: add it as an extra printer (like a kitchen printer) so the paper receipt still prints. '
                    'Ask your network admin to reserve this IP address for the tablet so it never changes.',
                    style: TextStyle(color: Colors.black54, fontSize: 13),
                  ),
                ],
                const Divider(height: 32),
                const Text('Last receipt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                if (last == null)
                  const Text('Nothing received yet. Print a test receipt from the POS.',
                      style: TextStyle(color: Colors.black54))
                else ...[
                  Text(
                    last.error != null
                        ? '⚠️ ${last.error}'
                        : last.orderNumber != null
                            ? '✅ Order #${last.orderNumber}${last.fromImage ? ' (read from image)' : ''}'
                            : '⚠️ No order number found. Set the label printed before the number in Dashboard → Counter & POS.',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(TimeOfDay.fromDateTime(last.at).format(ctx), style: const TextStyle(color: Colors.black54)),
                  if (last.excerpt.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8)),
                      child: Text(last.excerpt.length > 600 ? '${last.excerpt.substring(0, 600)}…' : last.excerpt,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                    ),
                ],
                const Divider(height: 32),
                if (displayName != null) ...[
                  _infoRow('Display', '$displayName'),
                  const SizedBox(height: 8),
                ],
                Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  TextButton.icon(
                    onPressed: () {
                      _poll();
                      Navigator.pop(ctx);
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                  if (_token != null)
                    TextButton.icon(
                      onPressed: () => _confirmUnpair(ctx),
                      icon: const Icon(Icons.link_off),
                      label: const Text('Unpair'),
                    ),
                  TextButton(onPressed: () => _editBaseUrl(ctx), child: const Text('Advanced')),
                ]),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _confirmUnpair(BuildContext ctx) async {
    final ok = await showDialog<bool>(
      context: ctx,
      builder: (d) => AlertDialog(
        title: const Text('Unpair this display?'),
        content: const Text('You will need a new 6-digit code from the Dashboard to pair it again.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(d, true), child: const Text('Unpair')),
        ],
      ),
    );
    if (ok != true) return;
    if (ctx.mounted) Navigator.pop(ctx);
    await _clearToken();
  }

  Widget _infoRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          SizedBox(width: 110, child: Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(child: SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
        ]),
      );

  // Server used for the QR links; for testing against a local dev server only.
  Future<void> _editBaseUrl(BuildContext ctx) async {
    final controller = TextEditingController(text: _baseUrl);
    final value = await showDialog<String>(
      context: ctx,
      builder: (d) => AlertDialog(
        title: const Text('Server address'),
        content: TextField(controller: controller, keyboardType: TextInputType.url),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, defaultBaseUrl), child: const Text('Reset')),
          FilledButton(onPressed: () => Navigator.pop(d, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    if (value == null || value.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('base_url', value);
    if (mounted) setState(() => _baseUrl = value.replaceAll(RegExp(r'/+$'), ''));
  }
}
