import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

// Native counter screen (same behaviour as the website's /counter page):
// big QR for the newest unscanned order, else the receipt-number check-in QR,
// plus a Ready / Preparing pickup board.

const _bg = Color(0xFFFAF8F5);
const _ink = Color(0xFF14110F);
const _muted = Color(0xFF6B7280);
const _teal = Color(0xFF0E7C7B);
const _amber = Color(0xFFB45309);
const _featureWindow = Duration(minutes: 10);

Color _hex(String? h, Color fallback) {
  if (h == null || !RegExp(r'^#?[0-9a-fA-F]{6}$').hasMatch(h)) return fallback;
  return Color(int.parse('FF${h.replaceAll('#', '')}', radix: 16));
}

class PairingView extends StatefulWidget {
  const PairingView({super.key, required this.onPair});
  final Future<String?> Function(String code) onPair; // returns an error message, or null on success

  @override
  State<PairingView> createState() => _PairingViewState();
}

class _PairingViewState extends State<PairingView> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    if (_code.text.length != 6 || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await widget.onPair(_code.text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = err;
      if (err != null) _code.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bg,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Card(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(32, 36, 32, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('📺', style: TextStyle(fontSize: 44)),
                const SizedBox(height: 8),
                const Text(
                  'Pair this counter display',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: _ink),
                ),
                const SizedBox(height: 8),
                const Text(
                  'In the QriousQR Dashboard, open Counter & POS, tap Add display, and enter the 6-digit code here.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: _muted, height: 1.5),
                ),
                const SizedBox(height: 22),
                TextField(
                  controller: _code,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  onChanged: (v) {
                    setState(() => _error = null);
                    if (v.length == 6) _submit(); // no need to tap the button
                  },
                  onSubmitted: (_) => _submit(),
                  style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 12,
                    fontFamily: 'monospace',
                  ),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: '000000',
                    filled: true,
                    fillColor: _bg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _code.text.length == 6 && !_busy ? _submit : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFF5722),
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(
                      _busy ? 'Pairing…' : 'Pair display',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CounterView extends StatelessWidget {
  const CounterView({
    super.key,
    required this.state,
    required this.baseUrl,
    required this.freshReady,
    required this.offline,
    required this.onMenu,
  });

  final Map<String, dynamic> state;
  final String baseUrl;
  final Set<String> freshReady; // qr_tokens that just turned ready (highlighted)
  final bool offline;
  final VoidCallback onMenu;

  @override
  Widget build(BuildContext context) {
    final company = Map<String, dynamic>.from(state['company'] as Map? ?? {});
    final accent = _hex(company['primary_color'] as String?, const Color(0xFFFF5722));
    final orders = (state['orders'] as List? ?? []).map((o) => Map<String, dynamic>.from(o as Map)).toList();
    final now = DateTime.now();

    Map<String, dynamic>? featured;
    for (final o in orders) {
      final created = DateTime.tryParse('${o['created_at']}');
      if (o['status'] == 'pending' &&
          o['viewed_at'] == null &&
          created != null &&
          now.difference(created) < _featureWindow) {
        featured = o;
        break;
      }
    }
    final ready = orders.where((o) => o['status'] == 'ready').toList();
    final preparing = orders.where((o) => o['status'] == 'pending').toList();
    final qrData = featured != null
        ? '$baseUrl/track/${featured['qr_token']}'
        : '$baseUrl/checkin/${state['checkin_code']}';

    return Container(
      color: _bg,
      child: Column(
        children: [
          // Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Row(
              children: [
                if ((company['logo_url'] ?? '').toString().isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.network(
                      company['logo_url'],
                      width: 52,
                      height: 52,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox(width: 52, height: 52),
                    ),
                  ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${company['name_en'] ?? ''}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: _ink),
                      ),
                      if ((company['name_ar'] ?? '').toString().isNotEmpty)
                        Text(
                          '${company['name_ar']}',
                          style: const TextStyle(fontSize: 17, color: _muted, fontWeight: FontWeight.w700),
                        ),
                    ],
                  ),
                ),
                if (offline)
                  const Text(
                    '● Reconnecting…',
                    style: TextStyle(color: _amber, fontWeight: FontWeight.w700),
                  ),
                IconButton(
                  onPressed: onMenu,
                  icon: const Icon(Icons.settings, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, c) {
                final wide = c.maxWidth > 860;
                final qrPanel = _QrPanel(featured: featured, qrData: qrData, accent: accent);
                final board = _Board(ready: ready, preparing: preparing, freshReady: freshReady);
                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: wide
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(flex: 5, child: qrPanel),
                            const SizedBox(width: 20),
                            Expanded(flex: 4, child: board),
                          ],
                        )
                      : Column(
                          children: [
                            Expanded(flex: 3, child: qrPanel),
                            const SizedBox(height: 16),
                            Expanded(flex: 2, child: board),
                          ],
                        ),
                );
              },
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text('Powered by QriousQR', style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
          ),
        ],
      ),
    );
  }
}

class _QrPanel extends StatelessWidget {
  const _QrPanel({required this.featured, required this.qrData, required this.accent});
  final Map<String, dynamic>? featured;
  final String qrData;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border(top: BorderSide(color: accent, width: 8)),
      ),
      padding: const EdgeInsets.all(20),
      child: LayoutBuilder(
        builder: (context, c) {
          final qrSize = (c.maxHeight * 0.55).clamp(140.0, 320.0);
          // Scale the whole block down on small screens instead of overflowing the card
          return FittedBox(
            fit: BoxFit.scaleDown,
            child: SizedBox(
              width: c.maxWidth,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (featured != null) ...[
                    const Text(
                      'YOUR ORDER · طلبك',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: _muted, letterSpacing: 1.2),
                    ),
                    FittedBox(
                      child: Text(
                        '#${featured!['order_number']}',
                        style: const TextStyle(
                          fontSize: 84,
                          fontWeight: FontWeight.w900,
                          color: _ink,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ] else
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: Text(
                        'Get alerted when your order is ready',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: _ink),
                      ),
                    ),
                  QrImageView(data: qrData, size: qrSize, backgroundColor: Colors.white),
                  const SizedBox(height: 14),
                  Text(
                    featured != null
                        ? 'Scan with your phone camera to get alerted'
                        : 'Scan, then enter the order number on your receipt',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: _ink),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    featured != null
                        ? 'امسح الرمز بكاميرا هاتفك ليصلك تنبيه عند جهوزية طلبك'
                        : 'امسح الرمز ثم أدخل رقم الطلب المطبوع على الفاتورة',
                    textAlign: TextAlign.center,
                    textDirection: TextDirection.rtl,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _muted),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.ready, required this.preparing, required this.freshReady});
  final List<Map<String, dynamic>> ready;
  final List<Map<String, dynamic>> preparing;
  final Set<String> freshReady;

  Widget _section(String title, String titleAr, List<Map<String, dynamic>> orders, Color color, bool big) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: TextStyle(fontSize: big ? 22 : 17, fontWeight: FontWeight.w900, color: color),
              ),
              const Spacer(),
              Text(
                titleAr,
                textDirection: TextDirection.rtl,
                style: TextStyle(fontSize: big ? 20 : 16, fontWeight: FontWeight.w800, color: color),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (orders.isEmpty)
            const Text('—', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 15))
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final o in orders)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    padding: EdgeInsets.symmetric(horizontal: big ? 16 : 12, vertical: big ? 10 : 6),
                    decoration: BoxDecoration(
                      color: big
                          ? (freshReady.contains(o['qr_token']) ? const Color(0xFF15803D) : color)
                          : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '#${o['order_number']}',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w900,
                        fontSize: big ? 30 : 20,
                        color: big ? Colors.white : const Color(0xFF374151),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          _section('Ready for pickup', 'جاهز للاستلام', ready, _teal, true),
          const SizedBox(height: 16),
          _section('Preparing', 'قيد التحضير', preparing, _amber, false),
        ],
      ),
    );
  }
}
