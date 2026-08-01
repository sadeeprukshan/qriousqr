import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/widgets/upgrade_premium_card.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';
import 'coupons_repository.dart';
import 'claim_step1_sheet.dart';
import 'claim_step2_sheet.dart';

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  final _repository = CouponsRepository();
  List<CouponModel> _coupons = [];
  bool _isLoading = true;
  bool _prefillProcessed = false;

  @override
  void initState() {
    super.initState();
    _loadCoupons();
  }

  Future<void> _loadCoupons() async {
    if (!authState.isPremium) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final list = await _repository.fetchMyCoupons();

    if (mounted) {
      setState(() {
        _coupons = list;
        _isLoading = false;
      });
      
      _processPrefill();
    }
  }

  void _processPrefill() {
    if (_prefillProcessed) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      final state = GoRouterState.of(context);
      final prefillSlug = state.uri.queryParameters['prefill_slug'];
      final prefillCategory = state.uri.queryParameters['prefill_category'];

      if (prefillSlug != null && prefillCategory != null) {
        final coupon = _coupons.firstWhere(
          (c) => c.companySlug == prefillSlug && c.category == prefillCategory,
          orElse: () => _coupons.first,
        );

        if (coupon.status == 'available' && coupon.companySlug == prefillSlug) {
          _prefillProcessed = true;
          _openClaimFlow(coupon);
        }
      }
    });
  }

  void _openClaimFlow(CouponModel coupon) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClaimStep1Sheet(
        coupon: coupon,
        onSuccess: (claimId, expiresAt) {
          _openVerificationFlow(coupon, claimId, expiresAt);
        },
      ),
    );
  }

  void _openVerificationFlow(CouponModel coupon, String claimId, DateTime expiresAt) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (context) => ClaimStep2Sheet(
        coupon: coupon,
        claimId: claimId,
        expiresAt: expiresAt,
        onSuccess: () {
          _loadCoupons();
        },
      ),
    );
  }

  String _getCategoryName(String category, bool isArabic) {
    switch (category.toLowerCase()) {
      case 'main_course':
        return isArabic ? 'طباق رئيسي' : 'Main Course';
      case 'dessert':
        return isArabic ? 'حلويات' : 'Dessert';
      case 'beverage':
        return isArabic ? 'مشروبات' : 'Beverage';
      default:
        return category.replaceAll('_', ' ');
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'main_course':
        return Icons.restaurant_menu;
      case 'dessert':
        return Icons.cake_outlined;
      case 'beverage':
        return Icons.local_cafe_outlined;
      default:
        return Icons.local_offer_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;

    // Route Guard for Regular users
    if (!authState.isPremium) {
      return QScaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(QSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isArabic ? 'الكوبونات' : 'Coupons',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: QColors.text,
                  ),
                ),
                const SizedBox(height: QSpacing.xl),
                const UpgradePremiumCard(),
              ],
            ),
          ),
        ),
      );
    }

    if (_isLoading) {
      return const QScaffold(
        body: Center(
          child: CircularProgressIndicator(color: QColors.primary),
        ),
      );
    }

    // Group coupons by restaurant slug
    final Map<String, List<CouponModel>> groupedCoupons = {};
    for (var coupon in _coupons) {
      groupedCoupons.putIfAbsent(coupon.companySlug, () => []).add(coupon);
    }

    return QScaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Padding(
              padding: const EdgeInsets.all(QSpacing.lg),
              child: Text(
                isArabic ? 'الكوبونات BOGO' : 'BOGO Coupons',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: QColors.text,
                ),
              ),
            ),

            // Content
            Expanded(
              child: RefreshIndicator(
                color: QColors.primary,
                onRefresh: _loadCoupons,
                child: groupedCoupons.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                          Center(
                            child: Column(
                              children: [
                                const Text('🎫', style: TextStyle(fontSize: 48)),
                                const SizedBox(height: QSpacing.sm),
                                Text(
                                  isArabic ? 'لا توجد كوبونات متاحة حالياً.' : 'No coupons available.',
                                  style: const TextStyle(color: QColors.textMuted, fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(QSpacing.lg, 0, QSpacing.lg, 100),
                        itemCount: groupedCoupons.keys.length,
                        itemBuilder: (context, index) {
                          final slug = groupedCoupons.keys.elementAt(index);
                          final restaurantCoupons = groupedCoupons[slug]!;
                          final firstCoupon = restaurantCoupons.first;
                          final logoUrl = firstCoupon.companyLogoUrl ??
                              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';
                          final restName = isArabic ? firstCoupon.companyNameAr : firstCoupon.companyNameEn;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: QSpacing.lg),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Restaurant Header Row
                                Row(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(color: QColors.border),
                                        image: DecorationImage(
                                          image: NetworkImage(logoUrl),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: QSpacing.sm),
                                    Text(
                                      restName,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: QColors.text,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: QSpacing.sm),
                                // Coupons tiles
                                ...restaurantCoupons.map((coupon) {
                                  final isAvailable = coupon.status == 'available';
                                  final isUsed = coupon.status == 'used';
                                  final isExpired = coupon.status == 'expired';

                                  Color statusColor = QColors.textSoft;
                                  Color statusBg = QColors.surface2;
                                  String statusText = isArabic ? 'غير متوفر' : 'Unavailable';

                                  if (isAvailable) {
                                    statusColor = QColors.primary;
                                    statusBg = QColors.primarySoft;
                                    statusText = isArabic ? 'متاح' : 'Available';
                                  } else if (isUsed) {
                                    statusColor = Colors.grey;
                                    statusBg = Colors.grey.shade200;
                                    statusText = isArabic
                                        ? 'مستخدم (${coupon.usedAt != null ? DateFormat('MM/dd').format(coupon.usedAt!) : ''})'
                                        : 'Used (${coupon.usedAt != null ? DateFormat('MM/dd').format(coupon.usedAt!) : ''})';
                                  } else if (isExpired) {
                                    statusColor = QColors.dangerFg;
                                    statusBg = QColors.dangerBg;
                                    statusText = isArabic ? 'منتهي' : 'Expired';
                                  }

                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    child: QCard(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: QSpacing.md,
                                        vertical: QSpacing.sm,
                                      ),
                                      onTap: isAvailable ? () => _openClaimFlow(coupon) : null,
                                      child: Row(
                                        children: [
                                          Icon(
                                            _getCategoryIcon(coupon.category),
                                            color: isAvailable ? QColors.primary : QColors.textSoft,
                                            size: 20,
                                          ),
                                          const SizedBox(width: QSpacing.md),
                                          Expanded(
                                            child: Text(
                                              _getCategoryName(coupon.category, isArabic),
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.bold,
                                                color: isAvailable ? QColors.text : QColors.textMuted,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: statusBg,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              statusText,
                                              style: TextStyle(
                                                color: statusColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
