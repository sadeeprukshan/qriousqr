import 'package:flutter/material.dart';
import '../colors.dart';
import '../radii.dart';
import '../spacing.dart';

class QInput extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? errorText;
  final TextEditingController? controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final Widget? suffixIcon;
  final Widget? prefixIcon;
  final bool readOnly;
  final String? initialValue;

  const QInput({
    super.key,
    this.label,
    this.hint,
    this.errorText,
    this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.onChanged,
    this.suffixIcon,
    this.prefixIcon,
    this.readOnly = false,
    this.initialValue,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: QColors.text,
            ),
          ),
          const SizedBox(height: QSpacing.xs + 2),
        ],
        TextFormField(
          controller: controller,
          initialValue: initialValue,
          obscureText: obscureText,
          keyboardType: keyboardType,
          onChanged: onChanged,
          readOnly: readOnly,
          style: const TextStyle(
            fontSize: 15,
            color: QColors.text,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
              fontSize: 14,
              color: QColors.textSoft,
            ),
            errorText: errorText,
            errorMaxLines: 2,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: readOnly ? QColors.surface2 : QColors.surface,
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            enabledBorder: OutlineInputBorder(
              borderRadius: QRadius.borderRadiusSm,
              borderSide: const BorderSide(color: QColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: QRadius.borderRadiusSm,
              borderSide: const BorderSide(color: QColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: QRadius.borderRadiusSm,
              borderSide: const BorderSide(color: QColors.dangerFg),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: QRadius.borderRadiusSm,
              borderSide: const BorderSide(color: QColors.dangerFg, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
