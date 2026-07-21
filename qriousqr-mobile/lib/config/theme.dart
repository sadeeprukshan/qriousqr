import 'package:flutter/material.dart';
import '../design_system/colors.dart';
import '../design_system/radii.dart';

class QTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: QColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: QColors.primary,
        primary: QColors.primary,
        surface: QColors.surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
      ),
      dialogTheme: const DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: QRadius.borderRadiusMd,
        ),
        backgroundColor: QColors.surface,
      ),
    );
  }
}
