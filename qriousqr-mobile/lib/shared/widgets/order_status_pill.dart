import 'package:flutter/material.dart';
import '../language_state.dart';

class OrderStatusPill extends StatelessWidget {
  final String status;

  const OrderStatusPill({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;
    
    String label = '';
    Color bg = const Color(0xFFEFEFEF);
    Color fg = const Color(0xFF666666);

    switch (status.toLowerCase()) {
      case 'pending':
        label = isArabic ? 'قيد التحضير' : 'Preparing';
        bg = const Color(0xFFFFF6F2);
        fg = const Color(0xFFFF5722);
        break;
      case 'ready':
        label = isArabic ? 'جاهز' : 'Ready';
        bg = const Color(0xFFE8F4FD);
        fg = const Color(0xFF0E7C7B);
        break;
      case 'delivered':
        label = isArabic ? 'تم التسليم' : 'Delivered';
        bg = const Color(0xFFEFEFEF);
        fg = const Color(0xFF666666);
        break;
      case 'cancelled':
        label = isArabic ? 'ملغى' : 'Cancelled';
        bg = const Color(0xFFFEEEEE);
        fg = const Color(0xFFC53030);
        break;
      default:
        label = status;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
