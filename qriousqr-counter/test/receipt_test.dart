import 'dart:convert';
import 'dart:typed_data';

import 'package:qriousqr_counter/receipt/escpos_parser.dart';
import 'package:qriousqr_counter/receipt/order_number_extractor.dart';
import 'package:test/test.dart';

const esc = 0x1B, gs = 0x1D, lf = 0x0A;

List<int> txt(String s) => utf8.encode(s);
List<int> init() => [esc, 0x40];
List<int> bigOn() => [gs, 0x21, 0x11]; // double width + height
List<int> bigOff() => [gs, 0x21, 0x00];
List<int> center() => [esc, 0x61, 1];
List<int> cut() => [gs, 0x56, 66, 0];

Uint8List receipt(List<List<int>> parts) => Uint8List.fromList(parts.expand((p) => p).toList());

void main() {
  test('English text receipt with "Order #" label', () {
    final r = parseEscPos(receipt([
      init(), center(), txt('KANTAMI CAFE'), [lf],
      txt('Date: 2026-11-20 14:32'), [lf],
      txt('Order #: 59'), [lf],
      txt('1 x Latte        18.00'), [lf],
      txt('Total            18.00'), [lf], cut(),
    ]));
    expect(r.text, contains('Order #: 59'));
    expect(extractFromParsed(r), '59');
  });

  test('Label on one line, big number alone on the next', () {
    final r = parseEscPos(receipt([
      init(), txt('ORDER NUMBER'), [lf], bigOn(), txt('  A-12  '), bigOff(), [lf],
      txt('Total 30.00'), [lf],
    ]));
    expect(extractFromParsed(r), 'A-12');
  });

  test('No label: falls back to the number printed in large font', () {
    final r = parseEscPos(receipt([
      init(), txt('Thank you!'), [lf], txt('Qty 2  Item 14  Price 25'), [lf],
      bigOn(), txt('134'), bigOff(), [lf],
    ]));
    expect(extractFromParsed(r), '134');
  });

  test('Restaurant custom label wins over generic ones', () {
    final r = parseEscPos(receipt([
      txt('Table: 7'), [lf], txt('Bill No 99812'), [lf], txt('Pickup Code: 42'), [lf],
    ]));
    expect(extractFromParsed(r, customLabel: 'Pickup Code'), '42');
  });

  test('Arabic label with Arabic-Indic digits', () {
    final r = parseEscPos(receipt([txt('رقم الطلب: ٥٩'), [lf], txt('المجموع ١٨'), [lf]]));
    expect(extractFromParsed(r), '59');
  });

  test('Arabic right-to-left: number printed before the label', () {
    final r = parseEscPos(receipt([txt('59 : رقم الطلب'), [lf]]));
    expect(extractFromParsed(r), '59');
  });

  test('Does not mistake dates, prices or "Order Type" for the number', () {
    final r = parseEscPos(receipt([
      txt('Order Type: Takeaway'), [lf], txt('2026-11-20'), [lf], txt('Total 18.50'), [lf],
    ]));
    expect(extractFromParsed(r), isNull);
  });

  test('GS v 0 raster image bands are decoded and stacked', () {
    // Two bands, 2 bytes wide (16 px), 3 rows each; first pixel of every row black.
    List<int> band() => [gs, 0x76, 0x30, 0, 2, 0, 3, 0, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00];
    final r = parseEscPos(receipt([init(), band(), band(), cut()]));
    expect(r.images, hasLength(1));
    expect(r.images.first.width, 16);
    expect(r.images.first.height, 6);
    expect(r.images.first.pixels[0], 1);
    expect(r.images.first.pixels[1], 0);
    expect(r.text.trim(), isEmpty);
  });

  test('Status-only connections are not treated as receipts', () {
    expect(isEmptyJob(Uint8List.fromList([0x10, 0x04, 0x01])), isTrue); // DLE EOT 1
    expect(isEmptyJob(receipt([init(), cut()])), isTrue);
    expect(isEmptyJob(receipt([init(), txt('Order #: 5'), [lf]])), isFalse);
  });

  test('OCR fallback picks the tallest standalone number', () {
    final lines = [
      OcrLine('KANTAMI', 20), OcrLine('Latte 18.00', 18), OcrLine('7', 19),
      OcrLine('59', 64), OcrLine('Thank you', 18),
    ];
    expect(extractFromOcr(lines), '59');
  });

  test('OCR with English label on a bilingual receipt', () {
    final lines = [OcrLine('Order No: 77', 22), OcrLine('Total 30', 18)];
    expect(extractFromOcr(lines), '77');
  });
}
