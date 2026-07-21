import 'package:flutter/material.dart';
import '../colors.dart';
import '../radii.dart';
import '../shadows.dart';
import '../spacing.dart';

class QCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  const QCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpacing.md),
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget cardContent = Container(
      padding: padding,
      decoration: const BoxDecoration(
        color: QColors.surface,
        borderRadius: QRadius.borderRadiusMd,
        boxShadow: QShadows.card,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: cardContent,
      );
    }

    return cardContent;
  }
}
