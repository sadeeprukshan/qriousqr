import 'language_state.dart';

class T {
  static String pick(Map<String, String> pair) {
    return languageState.isArabic 
        ? (pair['ar'] ?? pair['en'] ?? '') 
        : (pair['en'] ?? pair['ar'] ?? '');
  }

  static String pickField(Map<String, dynamic> obj, String base) {
    final ar = obj['${base}_ar'] as String?;
    final en = obj['${base}_en'] as String?;
    return languageState.isArabic ? (ar ?? en ?? '') : (en ?? ar ?? '');
  }

  // Common application strings
  static String get restaurants => pick({'en': 'Restaurants', 'ar': 'المطاعم'});
  static String get coupons => pick({'en': 'Coupons', 'ar': 'الكوبونات'});
  static String get orders => pick({'en': 'Orders', 'ar': 'الطلبات'});
  static String get profile => pick({'en': 'Profile', 'ar': 'الملف الشخصي'});
  static String get premium => pick({'en': 'Premium', 'ar': 'مميز'});
  static String get regular => pick({'en': 'Regular', 'ar': 'عادي'});
  
  static String get preparing => pick({'en': 'Preparing', 'ar': 'قيد التحضير'});
  static String get ready => pick({'en': 'Ready', 'ar': 'جاهز'});
  static String get delivered => pick({'en': 'Delivered', 'ar': 'تم التسليم'});
  static String get cancelled => pick({'en': 'Cancelled', 'ar': 'ملغى'});
}
