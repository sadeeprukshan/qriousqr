import 'package:flutter/material.dart';
import '../colors.dart';
import '../radii.dart';

enum QButtonVariant { primary, secondary, ghost }

class QButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final QButtonVariant variant;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;

  const QButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = QButtonVariant.primary,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
  });

  const QButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
  }) : variant = QButtonVariant.primary;

  const QButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
  }) : variant = QButtonVariant.secondary;

  const QButton.ghost({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.isFullWidth = false,
    this.icon,
  }) : variant = QButtonVariant.ghost;

  @override
  Widget build(BuildContext context) {
    if (variant == QButtonVariant.ghost) {
      return TextButton(
        onPressed: isLoading ? null : onPressed,
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          foregroundColor: QColors.primary,
        ),
        child: isLoading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: QColors.primary),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: QColors.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ],
              ),
      );
    }

    final isPrimary = variant == QButtonVariant.primary;
    final backgroundColor = isPrimary ? QColors.primary : Colors.transparent;
    final foregroundColor = isPrimary ? Colors.white : QColors.primary;
    final side = isPrimary ? BorderSide.none : const BorderSide(color: QColors.primary, width: 1.5);

    Widget child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: foregroundColor,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: foregroundColor,
                ),
              ),
            ],
          );

    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      // ignore: deprecated_member_use
      disabledBackgroundColor: isPrimary ? QColors.primary.withOpacity(0.6) : Colors.transparent,
      // ignore: deprecated_member_use
      disabledForegroundColor: foregroundColor.withOpacity(0.6),
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
      shape: RoundedRectangleBorder(
        borderRadius: QRadius.borderRadiusPill,
        side: side,
      ),
      elevation: 0,
    );

    final btnWidget = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: buttonStyle,
      child: child,
    );

    if (isFullWidth) {
      return SizedBox(
        width: double.infinity,
        child: btnWidget,
      );
    }

    return btnWidget;
  }
}
