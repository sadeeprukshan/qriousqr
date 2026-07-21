import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class QText {
  static TextStyle _baseStyle(BuildContext context, {
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    Color color = QColors.text,
  }) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final fontFunc = isRtl ? GoogleFonts.cairo : GoogleFonts.inter;
    return fontFunc(
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      color: color,
    );
  }

  static TextStyle display(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 48, fontWeight: FontWeight.w800, height: 1.1, color: color);

  static TextStyle h1(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 32, fontWeight: FontWeight.w800, height: 1.2, color: color);

  static TextStyle h2(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 22, fontWeight: FontWeight.w800, height: 1.3, color: color);

  static TextStyle h3(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 18, fontWeight: FontWeight.w700, height: 1.4, color: color);

  static TextStyle bodyLarge(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 16, fontWeight: FontWeight.w400, height: 1.6, color: color);

  static TextStyle body(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 14, fontWeight: FontWeight.w400, height: 1.6, color: color);

  static TextStyle small(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 13, fontWeight: FontWeight.w500, height: 1.5, color: color);

  static TextStyle fine(BuildContext context, {Color color = QColors.text}) =>
      _baseStyle(context, fontSize: 12, fontWeight: FontWeight.w400, height: 1.5, color: color);
}
