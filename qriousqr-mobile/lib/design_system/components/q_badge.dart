import 'package:flutter/material.dart';
import '../colors.dart';
import '../radii.dart';

enum QBadgeVariant { mainCourse, dessert, beverage, success, warning, danger }

class QBadge extends StatelessWidget {
  final String label;
  final QBadgeVariant variant;

  const QBadge({
    super.key,
    required this.label,
    this.variant = QBadgeVariant.success,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (variant) {
      case QBadgeVariant.mainCourse:
      case QBadgeVariant.dessert:
      case QBadgeVariant.beverage:
        bg = QColors.primarySoft;
        fg = QColors.primary;
        break;
      case QBadgeVariant.success:
        bg = QColors.successBg;
        fg = QColors.successFg;
        break;
      case QBadgeVariant.warning:
        bg = QColors.warningBg;
        fg = QColors.warningFg;
        break;
      case QBadgeVariant.danger:
        bg = QColors.dangerBg;
        fg = QColors.dangerFg;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: QRadius.borderRadiusPill,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}
