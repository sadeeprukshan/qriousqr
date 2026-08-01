import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageState extends ChangeNotifier {
  Locale _locale = const Locale('en');
  Locale get locale => _locale;
  bool get isArabic => _locale.languageCode == 'ar';
  TextDirection get textDirection => isArabic ? TextDirection.rtl : TextDirection.ltr;

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString('qrious.lang');
      if (code == 'ar' || code == 'en') {
        _locale = Locale(code!);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> setLocale(String code) async {
    if (code != 'en' && code != 'ar') return;
    _locale = Locale(code);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('qrious.lang', code);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> toggle() async {
    await setLocale(isArabic ? 'en' : 'ar');
  }
}

final languageState = LanguageState();
