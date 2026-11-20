import 'escpos_parser.dart';

/// Finds the order number on a receipt.
///   1. The restaurant's own label (set in the Dashboard), e.g. "Order #" or "رقم الطلب"
///   2. Common labels ("Order No", "Ticket", "#", ...)
///   3. The number printed in the LARGEST font (POS systems print the order number big
///      so staff can call it out). Works even when labels are unreadable (Arabic images).
///
/// Keep this in sync with src/lib/receiptNumber.js in the web app (Dashboard tester).

const defaultLabels = <String>[
  'order number', 'order no.', 'order no', 'order #', 'order#', 'order:', 'order',
  'ticket no', 'ticket #', 'ticket', 'check #', 'check no', 'receipt no', 'receipt #',
  'queue no', 'token no', 'token',
  'رقم الطلب', 'طلب رقم', 'الطلب', 'رقم التذكرة',
];

// An order number: optional 1-3 letter prefix, optional dash, 1-8 digits (e.g. 59, A-12, T42)
final _numberToken = RegExp(r'^[#:\-\s]*([A-Za-z]{0,3}-?\d{1,8})(?![\d])');
final _standaloneNumberLine = RegExp(r'^\s*#?\s*([A-Za-z]{0,3}-?\d{1,6})\s*$');
final _hashNumber = RegExp(r'(?:^|\s)#\s?(\d{1,6})(?=\s|$)');

/// Convert Arabic-Indic and Persian digits to ASCII.
String normalizeDigits(String s) {
  final b = StringBuffer();
  for (final r in s.runes) {
    if (r >= 0x0660 && r <= 0x0669) {
      b.writeCharCode(0x30 + r - 0x0660);
    } else if (r >= 0x06F0 && r <= 0x06F9) {
      b.writeCharCode(0x30 + r - 0x06F0);
    } else {
      b.writeCharCode(r);
    }
  }
  return b.toString();
}

/// Label-based search over plain text. Returns null if nothing found.
String? findByLabel(String rawText, {String? customLabel}) {
  final text = normalizeDigits(rawText);
  final lines = text.split('\n');
  final labels = <String>[
    if (customLabel != null && customLabel.trim().isNotEmpty) customLabel.trim(),
    ...defaultLabels,
  ];

  for (final label in labels) {
    final l = label.toLowerCase();
    for (int li = 0; li < lines.length; li++) {
      final line = lines[li];
      final idx = line.toLowerCase().indexOf(l);
      if (idx < 0) continue;
      // Number on the same line, right after the label
      final after = line.substring(idx + label.length);
      final m = _numberToken.firstMatch(after);
      if (m != null) return m.group(1)!.toUpperCase();
      // Arabic receipts sometimes print the number BEFORE the label (right-to-left)
      final before = line.substring(0, idx).trimRight();
      final mb = RegExp(r'([A-Za-z]{0,3}-?\d{1,8})\s*[#:]?\s*$').firstMatch(before);
      if (mb != null && RegExp(r'[؀-ۿ]').hasMatch(label)) return mb.group(1)!.toUpperCase();
      // Label on one line, big number alone on the next non-empty line
      for (int nj = li + 1; nj < lines.length && nj <= li + 2; nj++) {
        if (lines[nj].trim().isEmpty) continue;
        final mn = _standaloneNumberLine.firstMatch(lines[nj]);
        if (mn != null) return mn.group(1)!.toUpperCase();
        break;
      }
    }
  }
  final h = _hashNumber.firstMatch(text);
  return h?.group(1);
}

/// Biggest-font fallback for text receipts: a short number printed larger than normal.
String? findByLargestText(List<TextRun> runs) {
  int best = 1;
  String? found;
  for (final r in runs) {
    if (r.size <= best) continue;
    final m = RegExp(r'([A-Za-z]{0,3}-?\d{1,6})').firstMatch(normalizeDigits(r.text));
    if (m != null) {
      best = r.size;
      found = m.group(1)!.toUpperCase();
    }
  }
  return found;
}

/// Text receipt: label first, then largest-font number.
String? extractFromParsed(ParsedReceipt receipt, {String? customLabel}) {
  return findByLabel(receipt.text, customLabel: customLabel) ?? findByLargestText(receipt.runs);
}

/// One OCR'd line with its on-image height (for the largest-font fallback).
class OcrLine {
  final String text;
  final double height;
  OcrLine(this.text, this.height);
}

/// Image receipt: label search over OCR text, then the tallest short number on the image.
String? extractFromOcr(List<OcrLine> lines, {String? customLabel}) {
  final joined = lines.map((l) => l.text).join('\n');
  final byLabel = findByLabel(joined, customLabel: customLabel);
  if (byLabel != null) return byLabel;

  if (lines.isEmpty) return null;
  final heights = lines.map((l) => l.height).toList()..sort();
  final median = heights[heights.length ~/ 2];
  OcrLine? best;
  for (final l in lines) {
    final m = _standaloneNumberLine.firstMatch(normalizeDigits(l.text));
    if (m == null) continue;
    if (l.height < median * 1.5) continue; // must be clearly bigger than normal text
    if (best == null || l.height > best.height) best = l;
  }
  if (best == null) return null;
  return _standaloneNumberLine.firstMatch(normalizeDigits(best.text))!.group(1)!.toUpperCase();
}
