// Runs the tablet's printer pipeline on this computer (no tablet, no OCR) for end-to-end testing:
// listen on port 9100 -> parse ESC/POS -> extract order number -> report to QriousQR.
//
//   dart run tool/local_printer_e2e.dart --token qdsp_... [--label "Order #"] [--jobs 3]
import 'dart:async';
import 'dart:io';

import 'package:qriousqr_counter/backend.dart';
import 'package:qriousqr_counter/printer/print_server.dart';
import 'package:qriousqr_counter/receipt/escpos_parser.dart';
import 'package:qriousqr_counter/receipt/order_number_extractor.dart';

Future<void> main(List<String> args) async {
  String? arg(String name) {
    final i = args.indexOf('--$name');
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  }

  final token = arg('token') ?? (throw ArgumentError('--token is required'));
  final label = arg('label');
  final jobs = int.parse(arg('jobs') ?? '1');
  var handled = 0;
  final done = Completer<void>();

  late PrintServer server;
  server = PrintServer(onJob: (job, from) async {
    if (isEmptyJob(job)) {
      stdout.writeln('Status-only connection from $from (ignored, like the app does)');
      return;
    }
    final parsed = parseEscPos(job);
    final number = extractFromParsed(parsed, customLabel: label);
    stdout.writeln('Job from $from: ${job.length} bytes -> order number: ${number ?? "(not found)"}');
    try {
      final resp = await ingestReceipt(deviceToken: token, orderNumber: number, excerpt: parsed.text.trim(), printerIp: '127.0.0.1');
      stdout.writeln('  backend: $resp');
    } catch (e) {
      stdout.writeln('  backend error: $e');
    }
    if (++handled >= jobs && !done.isCompleted) done.complete();
  });
  await server.start();
  stdout.writeln('Listening on port 9100 for $jobs job(s)...');
  await done.future.timeout(const Duration(seconds: 90), onTimeout: () => stdout.writeln('Timed out.'));
  await server.stop();
}
