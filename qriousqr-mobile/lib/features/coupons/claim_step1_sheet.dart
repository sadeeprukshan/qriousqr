import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/spacing.dart';
import '../../shared/language_state.dart';
import 'coupons_repository.dart';

class ClaimStep1Sheet extends StatefulWidget {
  final CouponModel coupon;
  final Function(String claimId, DateTime expiresAt) onSuccess;

  const ClaimStep1Sheet({
    super.key,
    required this.coupon,
    required this.onSuccess,
  });

  @override
  State<ClaimStep1Sheet> createState() => _ClaimStep1SheetState();
}

class _ClaimStep1SheetState extends State<ClaimStep1Sheet> {
  final _repository = CouponsRepository();
  final _pinController = TextEditingController();
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    final pin = _pinController.text.trim();
    if (pin.length < 4) {
      setState(() {
        _errorMsg = languageState.isArabic ? 'الرجاء إدخال الرمز السري للمطعم.' : 'Please enter the merchant PIN.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final res = await _repository.claimCouponStep1(widget.coupon.id, pin);
      if (res != null && mounted) {
        final claimId = res['claim_id'] as String;
        final expiresAtStr = res['expires_at'] as String;
        final expiresAt = DateTime.parse(expiresAtStr);
        widget.onSuccess(claimId, expiresAt);
        Navigator.pop(context);
      } else {
        setState(() {
          _errorMsg = languageState.isArabic ? 'رمز التحقق خاطئ. يرجى المحاولة مرة أخرى.' : 'Invalid PIN. Please try again.';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString();
        setState(() {
          if (msg.contains('premium_required')) {
            _errorMsg = languageState.isArabic 
                ? 'كوبونات BOGO متاحة للعملاء المميزين فقط.' 
                : 'BOGO coupons are for Premium customers only.';
          } else {
            _errorMsg = languageState.isArabic ? 'رمز التحقق خاطئ. يرجى المحاولة مرة أخرى.' : 'Invalid PIN. Please try again.';
          }
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;
    final catLabel = widget.coupon.category.replaceAll('_', ' ').toUpperCase();

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(QSpacing.lg),
        decoration: const BoxDecoration(
          color: QColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isArabic ? 'الخطوة 1: التحقق من المطعم' : 'Step 1: Merchant Verification',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: QColors.text,
                ),
              ),
              const SizedBox(height: QSpacing.sm),
              Text(
                isArabic
                    ? 'اطلب من موظف المطعم إدخال الرمز السري الخاص به للموافقة على عرض $catLabel في ${widget.coupon.companyNameAr}'
                    : 'Ask the restaurant operator to enter their merchant PIN to authorize the $catLabel BOGO at ${widget.coupon.companyNameEn}.',
                style: const TextStyle(
                  fontSize: 13,
                  color: QColors.textMuted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: QSpacing.lg),

              if (_errorMsg != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(QSpacing.md),
                  decoration: BoxDecoration(
                    color: QColors.dangerBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: QColors.dangerFg.withOpacity(0.2)),
                  ),
                  child: Text(
                    _errorMsg!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: QColors.dangerFg,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: QSpacing.md),
              ],

              QInput(
                label: isArabic ? 'الرمز السري للمطعم' : 'Merchant PIN',
                hint: '••••••',
                controller: _pinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                maxLength: 6,
              ),
              const SizedBox(height: QSpacing.lg),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        isArabic ? 'إلغاء' : 'Cancel',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: QSpacing.md),
                  Expanded(
                    child: QButton.primary(
                      label: isArabic ? 'تأكيد' : 'Verify',
                      isLoading: _isLoading,
                      onPressed: _handleVerify,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
