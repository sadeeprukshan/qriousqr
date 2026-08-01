import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/spacing.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';
import 'coupons_repository.dart';

class ClaimStep2Sheet extends StatefulWidget {
  final CouponModel coupon;
  final String claimId;
  final DateTime expiresAt;
  final VoidCallback onSuccess;

  const ClaimStep2Sheet({
    super.key,
    required this.coupon,
    required this.claimId,
    required this.expiresAt,
    required this.onSuccess,
  });

  @override
  State<ClaimStep2Sheet> createState() => _ClaimStep2SheetState();
}

class _ClaimStep2SheetState extends State<ClaimStep2Sheet> {
  final _repository = CouponsRepository();
  RealtimeChannel? _realtimeChannel;
  Timer? _timer;
  int _secondsRemaining = 0;
  String _status = 'pending'; // 'pending' | 'authorized' | 'rejected' | 'expired'
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _startTimer() {
    final diff = widget.expiresAt.difference(DateTime.now());
    _secondsRemaining = diff.inSeconds;
    if (_secondsRemaining <= 0) {
      setState(() {
        _status = 'expired';
      });
      return;
    }

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining <= 1) {
        timer.cancel();
        setState(() {
          _secondsRemaining = 0;
          _status = 'expired';
        });
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  void _subscribeRealtime() {
    _realtimeChannel = supabase
        .channel('claim_${widget.claimId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'coupon_claims',
          callback: (payload) {
            if (payload.newRecord['id'] != widget.claimId) return;
            final newStatus = payload.newRecord['status'] as String?;
            if (newStatus == 'authorized') {
              setState(() {
                _status = 'authorized';
              });
              _timer?.cancel();
              Future.delayed(const Duration(seconds: 2), () {
                if (mounted) {
                  widget.onSuccess();
                  Navigator.pop(context);
                }
              });
            } else if (newStatus == 'rejected' || newStatus == 'cancelled') {
              setState(() {
                _status = 'rejected';
              });
              _timer?.cancel();
            }
          },
        )
        .subscribe();
  }

  Future<void> _handleCancel() async {
    setState(() {
      _isCancelling = true;
    });
    try {
      await _repository.cancelMyClaim(widget.claimId);
    } catch (_) {}
    if (mounted) {
      Navigator.pop(context);
    }
  }

  String _formatDuration(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  String _formatUserPin(String? pin) {
    if (pin == null || pin.isEmpty) return '--- --- ---';
    final clean = pin.replaceAll(RegExp(r'\s'), '');
    if (clean.length != 9) return pin;
    return '${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)}';
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;
    final formattedPin = _formatUserPin(authState.profile?.userPin);

    Widget content;

    if (_status == 'authorized') {
      content = Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle_outline, color: Colors.green, size: 72),
          const SizedBox(height: QSpacing.md),
          Text(
            isArabic ? 'تم قبول الكوبون بنجاح!' : 'BOGO Claim Authorized!',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
          ),
          const SizedBox(height: QSpacing.sm),
          Text(
            isArabic ? 'استمتع بوجبتك!' : 'Enjoy your meal!',
            style: const TextStyle(color: QColors.textMuted),
          ),
        ],
      );
    } else if (_status == 'rejected') {
      content = Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: QColors.dangerFg, size: 72),
          const SizedBox(height: QSpacing.md),
          Text(
            isArabic ? 'تم رفض الطلب' : 'Claim Rejected',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: QColors.dangerFg),
          ),
          const SizedBox(height: QSpacing.sm),
          Text(
            isArabic ? 'تم رفض عملية المطالبة أو إلغاؤها.' : 'This claim was rejected or cancelled.',
            style: const TextStyle(color: QColors.textMuted),
          ),
          const SizedBox(height: QSpacing.lg),
          QButton.primary(
            label: isArabic ? 'إغلاق' : 'Close',
            onPressed: () => Navigator.pop(context),
          ),
        ],
      );
    } else if (_status == 'expired') {
      content = Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.timer_off_outlined, color: QColors.textSoft, size: 72),
          const SizedBox(height: QSpacing.md),
          Text(
            isArabic ? 'انتهت صلاحية الرمز' : 'Claim Expired',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: QColors.text),
          ),
          const SizedBox(height: QSpacing.sm),
          Text(
            isArabic ? 'انتهى الوقت المخصص للمطالبة بالكوبون.' : 'The time limit for this claim has expired.',
            style: const TextStyle(color: QColors.textMuted),
          ),
          const SizedBox(height: QSpacing.lg),
          QButton.primary(
            label: isArabic ? 'إغلاق' : 'Close',
            onPressed: () => Navigator.pop(context),
          ),
        ],
      );
    } else {
      content = Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            isArabic ? 'الخطوة 2: اعرض هذا الرمز للموظف' : 'Step 2: Show this code to the operator',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: QColors.text,
            ),
          ),
          const SizedBox(height: QSpacing.lg),
          // User Pin Display
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: QColors.surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: QColors.border),
            ),
            child: Text(
              formattedPin,
              style: const TextStyle(
                fontSize: 32,
                fontFamily: 'monospace',
                fontWeight: FontWeight.w900,
                color: QColors.primary,
                letterSpacing: 2,
              ),
            ),
          ),
          const SizedBox(height: QSpacing.lg),
          // Timer
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.timer_outlined, color: QColors.primary, size: 18),
              const SizedBox(width: 6),
              Text(
                '${isArabic ? 'ينتهي الرمز خلال' : 'Expires in'} ${_formatDuration(_secondsRemaining)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: QColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: QSpacing.xl),
          QButton.secondary(
            label: isArabic ? 'إلغاء المطالبة' : 'Cancel Claim',
            isLoading: _isCancelling,
            onPressed: _handleCancel,
          ),
        ],
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(QSpacing.lg),
      decoration: const BoxDecoration(
        color: QColors.surface,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: QSpacing.md),
          child: content,
        ),
      ),
    );
  }
}
