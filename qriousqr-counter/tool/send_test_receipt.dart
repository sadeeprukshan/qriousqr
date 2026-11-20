// Sends a sample ESC/POS receipt to a QriousQR Counter tablet, exactly like a POS does.
// Use it to test printer mode without a POS:
//
//   dart run tool/send_test_receipt.dart --host 192.168.1.50 --number 59
//   dart run tool/send_test_receipt.dart --host 192.168.1.50 --number 60 --style big
//   dart run tool/send_test_receipt.dart --host 192.168.1.50 --number 61 --style arabic
//
// Styles: label (default, "Order #: 59"), big (no label, number in large font), arabic (رقم الطلب),
// image (whole receipt sent as a picture, like POS systems that print graphics; tests OCR).
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;

/// Draws the receipt as a black/white picture and encodes it as an ESC/POS raster (GS v 0).
List<int> imageReceipt(String number) {
  const width = 576; // 80 mm printer
  final pic = img.Image(width: width, height: 330);
  img.fill(pic, color: img.ColorRgb8(255, 255, 255));
  final black = img.ColorRgb8(0, 0, 0);
  img.drawString(pic, 'QRIOUS TEST CAFE', font: img.arial24, x: 150, y: 10, color: black);
  img.drawString(pic, 'Order #: $number', font: img.arial48, x: 40, y: 60, color: black);
  img.drawString(pic, '1 x Latte          18.00', font: img.arial24, x: 40, y: 160, color: black);
  img.drawString(pic, 'Total              18.00', font: img.arial24, x: 40, y: 200, color: black);
  img.drawString(pic, 'Thank you!', font: img.arial24, x: 210, y: 260, color: black);

  const bytesPerRow = width ~/ 8;
  final data = <int>[];
  for (var y = 0; y < pic.height; y++) {
    for (var bx = 0; bx < bytesPerRow; bx++) {
      var b = 0;
      for (var bit = 0; bit < 8; bit++) {
        final p = pic.getPixel(bx * 8 + bit, y);
        if (p.r < 128) b |= 0x80 >> bit;
      }
      data.add(b);
    }
  }
  return [0x1D, 0x76, 0x30, 0, bytesPerRow & 0xFF, bytesPerRow >> 8, pic.height & 0xFF, pic.height >> 8, ...data];
}

Future<void> main(List<String> args) async {
  String arg(String name, String fallback) {
    final i = args.indexOf('--$name');
    return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
  }

  final host = arg('host', '127.0.0.1');
  final port = int.parse(arg('port', '9100'));
  final number = arg('number', '59');
  final style = arg('style', 'label');

  const esc = 0x1B, gs = 0x1D, lf = 0x0A;
  final bytes = <int>[esc, 0x40, esc, 0x61, 1];
  void line(String s) => bytes..addAll(utf8.encode(s))..add(lf);

  if (style != 'image') {
    line('QRIOUS TEST CAFE');
    line('2026-11-20  14:32');
  }
  switch (style) {
    case 'big':
      line('Thank you for your order');
      bytes.addAll([gs, 0x21, 0x11]); // double width + height
      line(number);
      bytes.addAll([gs, 0x21, 0x00]);
      break;
    case 'image':
      bytes.addAll(imageReceipt(number));
      bytes.add(lf);
      break;
    case 'arabic':
      line('رقم الطلب: $number');
      break;
    default:
      line('Order #: $number');
  }
  if (style != 'image') {
    line('1 x Latte            18.00');
    line('Total                18.00');
  }
  bytes.addAll([esc, 0x64, 3, gs, 0x56, 66, 0]); // feed + cut

  final socket = await Socket.connect(host, port, timeout: const Duration(seconds: 5));
  // Like many POS systems, ask "are you online?" first and wait for the answer
  socket.add([0x10, 0x04, 0x01]);
  final reply = await socket.first.timeout(const Duration(seconds: 3), onTimeout: () => Uint8List(0));
  stdout.writeln(reply.isNotEmpty
      ? 'Printer status reply: 0x${reply.first.toRadixString(16)} (online)'
      : 'No status reply (some printers do not answer)');

  final s2 = await Socket.connect(host, port);
  s2.add(bytes);
  await s2.flush();
  // Give the receiver a moment to read everything before we hang up
  await Future.delayed(const Duration(milliseconds: 800));
  await s2.close();
  // close() only ends our side; destroy both sockets so the program can exit
  s2.destroy();
  socket.destroy();
  stdout.writeln('Sent receipt for order $number ($style) to $host:$port (${bytes.length} bytes)');
  exit(0);
}
