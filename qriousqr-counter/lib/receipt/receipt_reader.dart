import 'dart:io';
import 'dart:typed_data';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

import 'escpos_parser.dart';
import 'order_number_extractor.dart';

class ReceiptResult {
  final String? orderNumber;
  final String excerpt; // readable text we got from the receipt (for Dashboard diagnostics)
  final bool fromImage;
  ReceiptResult(this.orderNumber, this.excerpt, this.fromImage);
}

/// Turns a raw print job into an order number: text receipts are read directly,
/// image receipts go through on-device text recognition (no internet needed).
class ReceiptReader {
  final _recognizer = TextRecognizer(script: TextRecognitionScript.latin);

  /// Returns null for jobs with nothing printed (e.g. a POS only asking "are you online?").
  Future<ReceiptResult?> read(Uint8List job, {String? customLabel}) async {
    final parsed = parseEscPos(job);
    final text = parsed.text.trim();
    if (text.isEmpty && !parsed.hasImages) return null;

    final fromText = extractFromParsed(parsed, customLabel: customLabel);
    if (fromText != null || !parsed.hasImages) {
      return ReceiptResult(fromText, text, false);
    }

    // Image receipt: OCR each image, keep line heights for the largest-number fallback
    final lines = <OcrLine>[];
    for (final image in parsed.images) {
      lines.addAll(await _ocr(image));
    }
    final number = extractFromOcr(lines, customLabel: customLabel);
    final ocrText = lines.map((l) => l.text).join('\n');
    return ReceiptResult(number, [if (text.isNotEmpty) text, ocrText].join('\n').trim(), true);
  }

  Future<List<OcrLine>> _ocr(RasterImage raster) async {
    // Thermal receipts are ~576 px wide with tiny text: add a white margin and scale 2x for OCR
    const margin = 16;
    final out = img.Image(width: raster.width * 2 + margin * 2, height: raster.height * 2 + margin * 2);
    img.fill(out, color: img.ColorRgb8(255, 255, 255));
    for (var y = 0; y < raster.height; y++) {
      for (var x = 0; x < raster.width; x++) {
        if (raster.pixels[y * raster.width + x] == 1) {
          img.fillRect(out,
              x1: margin + x * 2, y1: margin + y * 2, x2: margin + x * 2 + 1, y2: margin + y * 2 + 1,
              color: img.ColorRgb8(0, 0, 0));
        }
      }
    }
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/receipt_${DateTime.now().microsecondsSinceEpoch}.png');
    await file.writeAsBytes(img.encodePng(out));
    try {
      final result = await _recognizer.processImage(InputImage.fromFilePath(file.path));
      return [
        for (final block in result.blocks)
          for (final line in block.lines) OcrLine(line.text, line.boundingBox.height),
      ];
    } finally {
      file.delete().ignore();
    }
  }

  void dispose() => _recognizer.close();
}
