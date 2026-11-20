import 'dart:convert';
import 'dart:typed_data';

/// A run of text printed at one size. Order numbers are usually printed large,
/// so we keep the size to use as a fallback signal.
class TextRun {
  final String text;
  final int size; // 1 = normal; >1 = enlarged (max of width/height multiplier)
  TextRun(this.text, this.size);
}

/// A monochrome raster image from the print stream (receipts printed as pictures,
/// e.g. Arabic receipts on printers without Arabic fonts). 1 = black pixel.
class RasterImage {
  final int width; // pixels
  final int height; // pixels
  final Uint8List pixels; // width*height, 1 = black, 0 = white
  RasterImage(this.width, this.height, this.pixels);
}

class ParsedReceipt {
  final String text;
  final List<TextRun> runs;
  final List<RasterImage> images;
  ParsedReceipt(this.text, this.runs, this.images);
  bool get hasImages => images.isNotEmpty;
}

/// True when a print job contains nothing printable: no text and no images.
/// POS systems often connect only to ask for printer status before the real job.
bool isEmptyJob(Uint8List data) {
  final r = parseEscPos(data);
  return r.text.trim().isEmpty && !r.hasImages;
}

/// Parses an ESC/POS byte stream (what a POS sends to a network receipt printer on port 9100)
/// into plain text, sized text runs, and raster images.
ParsedReceipt parseEscPos(Uint8List data) {
  final runs = <TextRun>[];
  final textBytes = <int>[];
  final rasterBands = <RasterImage>[];
  int size = 1;
  int escSize = 1; // from ESC !
  int gsSize = 1; // from GS !

  void flush() {
    if (textBytes.isEmpty) return;
    runs.add(TextRun(_decode(textBytes), size));
    textBytes.clear();
  }

  void setSize() {
    final s = escSize > gsSize ? escSize : gsSize;
    if (s != size) {
      flush();
      size = s;
    }
  }

  int i = 0;
  int at(int k) => k < data.length ? data[k] : 0;

  while (i < data.length) {
    final b = data[i];

    if (b == 0x1B) {
      // ESC
      final c = at(i + 1);
      switch (c) {
        case 0x40: // ESC @ init
          escSize = 1;
          gsSize = 1;
          setSize();
          i += 2;
          break;
        case 0x21: // ESC ! n  (bit4 double height, bit5 double width)
          final n = at(i + 2);
          escSize = ((n & 0x10) != 0 || (n & 0x20) != 0) ? 2 : 1;
          setSize();
          i += 3;
          break;
        case 0x2A: // ESC * m nL nH d...  bit image (column format)
          final m = at(i + 2);
          final cols = at(i + 3) + at(i + 4) * 256;
          final bytesPerCol = (m == 32 || m == 33) ? 3 : 1;
          final start = i + 5;
          final len = cols * bytesPerCol;
          if (start + len <= data.length && cols > 0) {
            rasterBands.add(_columnImage(data.sublist(start, start + len), cols, bytesPerCol));
          }
          i = start + len;
          break;
        case 0x70: // ESC p m t1 t2 (cash drawer)
          i += 5;
          break;
        case 0x63: // ESC c n m
          i += 4;
          break;
        case 0x44: // ESC D n1..nk NUL (tab stops)
          i += 2;
          while (i < data.length && data[i] != 0) {
            i++;
          }
          i++;
          break;
        case 0x24: // ESC $ nL nH
        case 0x5C: // ESC \ nL nH
          i += 4;
          break;
        case 0x32: // ESC 2
        case 0x3C: // ESC <
        case 0x69: // ESC i (cut)
        case 0x6D: // ESC m (cut)
          i += 2;
          break;
        default: // most ESC commands take one parameter (ESC E n, ESC a n, ESC d n, ESC t n, ...)
          if (c == 0x64 || c == 0x4A) {
            flush();
            textBytes.add(0x0A);
          }
          i += 3;
      }
      continue;
    }

    if (b == 0x1D) {
      // GS
      final c = at(i + 1);
      if (c == 0x76 && at(i + 2) == 0x30) {
        // GS v 0 m xL xH yL yH d...  raster bit image
        final widthBytes = at(i + 4) + at(i + 5) * 256;
        final height = at(i + 6) + at(i + 7) * 256;
        final start = i + 8;
        final len = widthBytes * height;
        if (start + len <= data.length && widthBytes > 0 && height > 0) {
          rasterBands.add(_rowImage(data.sublist(start, start + len), widthBytes, height));
        }
        i = start + len;
      } else if (c == 0x28) {
        // GS ( X pL pH ...  extended commands: skip by length
        final len = at(i + 3) + at(i + 4) * 256;
        i += 5 + len;
      } else if (c == 0x38 && at(i + 2) == 0x4C) {
        // GS 8 L p1 p2 p3 p4 ...  (4-byte length)
        final len = at(i + 3) + at(i + 4) * 256 + at(i + 5) * 65536 + at(i + 6) * 16777216;
        i += 7 + len;
      } else if (c == 0x21) {
        // GS ! n  character size: high nibble width-1, low nibble height-1
        final n = at(i + 2);
        final w = ((n >> 4) & 0x0F) + 1;
        final h = (n & 0x0F) + 1;
        gsSize = w > h ? w : h;
        setSize();
        i += 3;
      } else if (c == 0x56) {
        // GS V m [n]  cut
        final m = at(i + 2);
        i += (m == 65 || m == 66 || m == 97 || m == 98) ? 4 : 3;
      } else if (c == 0x6B) {
        // GS k m ...  barcode
        final m = at(i + 2);
        if (m <= 6) {
          i += 3;
          while (i < data.length && data[i] != 0) {
            i++;
          }
          i++;
        } else {
          i += 4 + at(i + 3);
        }
      } else if (c == 0x2A) {
        // GS * x y d...  define downloaded bit image
        i += 4 + at(i + 2) * at(i + 3) * 8;
      } else if (c == 0x4C || c == 0x57 || c == 0x50 || c == 0x24 || c == 0x5C) {
        i += 4; // two-byte params
      } else {
        i += 3; // one-byte param (GS B, GS H, GS f, GS h, GS w, GS a, GS r, GS /, GS b ...)
      }
      continue;
    }

    if (b == 0x1C) {
      // FS
      final c = at(i + 1);
      if (c == 0x70) {
        i += 4; // FS p n m (print NV image)
      } else if (c == 0x26 || c == 0x2E) {
        i += 2; // FS & / FS .
      } else {
        i += 3;
      }
      continue;
    }

    if (b == 0x10) {
      // DLE EOT/ENQ n or DLE DC4 ...
      i += (at(i + 1) == 0x14) ? 5 : 3;
      continue;
    }

    if (b == 0x0A || b == 0x0C) {
      textBytes.add(0x0A);
      i++;
      continue;
    }
    if (b == 0x09) {
      textBytes.add(0x20);
      i++;
      continue;
    }
    if (b < 0x20) {
      i++; // CR and other controls
      continue;
    }
    textBytes.add(b);
    i++;
  }
  flush();

  final text = runs.map((r) => r.text).join();
  return ParsedReceipt(text, runs, _stackBands(rasterBands));
}

String _decode(List<int> bytes) {
  try {
    return utf8.decode(bytes);
  } catch (_) {
    return latin1.decode(bytes); // digits and Latin text survive; legacy Arabic code pages don't
  }
}

// GS v 0 data: rows of widthBytes, MSB = leftmost pixel
RasterImage _rowImage(Uint8List d, int widthBytes, int height) {
  final width = widthBytes * 8;
  final px = Uint8List(width * height);
  for (int y = 0; y < height; y++) {
    for (int xb = 0; xb < widthBytes; xb++) {
      final v = d[y * widthBytes + xb];
      for (int bit = 0; bit < 8; bit++) {
        if ((v & (0x80 >> bit)) != 0) px[y * width + xb * 8 + bit] = 1;
      }
    }
  }
  return RasterImage(width, height, px);
}

// ESC * data: columns of 1 or 3 bytes, MSB = top pixel
RasterImage _columnImage(Uint8List d, int cols, int bytesPerCol) {
  final height = bytesPerCol * 8;
  final px = Uint8List(cols * height);
  for (int x = 0; x < cols; x++) {
    for (int k = 0; k < bytesPerCol; k++) {
      final v = d[x * bytesPerCol + k];
      for (int bit = 0; bit < 8; bit++) {
        if ((v & (0x80 >> bit)) != 0) px[(k * 8 + bit) * cols + x] = 1;
      }
    }
  }
  return RasterImage(cols, height, px);
}

/// Receipts are printed as many horizontal bands; join consecutive bands of the
/// same width into one tall image so OCR sees whole lines.
List<RasterImage> _stackBands(List<RasterImage> bands) {
  final out = <RasterImage>[];
  int k = 0;
  while (k < bands.length) {
    final width = bands[k].width;
    final group = <RasterImage>[];
    while (k < bands.length && bands[k].width == width) {
      group.add(bands[k]);
      k++;
    }
    final height = group.fold<int>(0, (s, b) => s + b.height);
    final px = Uint8List(width * height);
    int off = 0;
    for (final b in group) {
      px.setRange(off, off + b.pixels.length, b.pixels);
      off += b.pixels.length;
    }
    out.add(RasterImage(width, height, px));
  }
  return out;
}
