import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

/// Makes this tablet behave like a network receipt printer ("raw" / JetDirect, port 9100),
/// the kind every restaurant POS can print to. Each connection = one print job.
class PrintServer {
  PrintServer({required this.onJob, this.port = 9100});

  final int port;
  final void Function(Uint8List job, String fromAddress) onJob;
  ServerSocket? _server;

  bool get running => _server != null;

  Future<void> start() async {
    if (_server != null) return;
    _server = await ServerSocket.bind(InternetAddress.anyIPv4, port, shared: true);
    _server!.listen(_handle, onError: (_) {});
  }

  Future<void> stop() async {
    await _server?.close();
    _server = null;
  }

  void _handle(Socket socket) {
    final buffer = BytesBuilder(copy: false);
    final from = socket.remoteAddress.address;
    var done = false;
    Timer? idle;

    void finish() {
      if (done) return;
      done = true;
      idle?.cancel();
      if (buffer.isNotEmpty) onJob(buffer.takeBytes(), from);
      socket.destroy();
    }

    // Some POS systems keep the connection open after printing; treat a pause as end of job.
    idle = Timer(const Duration(seconds: 4), finish);

    socket.listen(
      (chunk) {
        buffer.add(chunk);
        _answerStatusQueries(socket, chunk);
        idle?.cancel();
        idle = Timer(const Duration(milliseconds: 1500), finish);
      },
      onDone: finish,
      onError: (_) => finish(),
      cancelOnError: true,
    );
  }

  /// Many POS systems ask "are you online?" (DLE EOT n) before printing and refuse to print
  /// if a printer never answers. Reply like a healthy printer: online, cover closed, paper OK.
  void _answerStatusQueries(Socket socket, List<int> chunk) {
    for (var i = 0; i + 2 < chunk.length; i++) {
      if (chunk[i] == 0x10 && chunk[i + 1] == 0x04) {
        try {
          socket.add([0x12]);
        } catch (_) {}
      }
    }
  }
}

/// The tablet's address on the local Wi-Fi network, to type into the POS printer settings.
Future<String?> localIpAddress() async {
  try {
    final interfaces = await NetworkInterface.list(type: InternetAddressType.IPv4, includeLoopback: false);
    String? fallback;
    for (final iface in interfaces) {
      for (final addr in iface.addresses) {
        final ip = addr.address;
        final private = ip.startsWith('192.168.') || ip.startsWith('10.') ||
            RegExp(r'^172\.(1[6-9]|2\d|3[01])\.').hasMatch(ip);
        if (!private) continue;
        final name = iface.name.toLowerCase();
        if (name.contains('wlan') || name.contains('en') || name.contains('eth')) return ip;
        fallback ??= ip;
      }
    }
    return fallback;
  } catch (_) {
    return null;
  }
}
