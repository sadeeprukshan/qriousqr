import '../../config/supabase_client.dart';
import '../../shared/auth_state.dart';

class CouponModel {
  final String id;
  final String companyId;
  final String status; // 'available' | 'used' | 'expired'
  final String category; // 'main_course' | 'dessert' | 'beverage'
  final int year;
  final DateTime? usedAt;

  // Joined company details
  final String companyNameEn;
  final String companyNameAr;
  final String? companyLogoUrl;
  final String? companyCoverUrl;
  final String companySlug;

  CouponModel({
    required this.id,
    required this.companyId,
    required this.status,
    required this.category,
    required this.year,
    this.usedAt,
    required this.companyNameEn,
    required this.companyNameAr,
    this.companyLogoUrl,
    this.companyCoverUrl,
    required this.companySlug,
  });

  factory CouponModel.fromMap(Map<String, dynamic> m) {
    final company = m['companies'] as Map<String, dynamic>? ?? {};
    return CouponModel(
      id: m['id'] ?? '',
      companyId: m['company_id'] ?? '',
      status: m['status'] ?? 'available',
      category: m['category'] ?? '',
      year: m['year'] ?? DateTime.now().year,
      usedAt: m['used_at'] != null ? DateTime.parse(m['used_at']) : null,
      companyNameEn: company['name_en'] ?? '',
      companyNameAr: company['name_ar'] ?? '',
      companyLogoUrl: company['logo_url'] as String?,
      companyCoverUrl: company['cover_url'] as String?,
      companySlug: company['slug'] ?? '',
    );
  }
}

class CouponsRepository {
  Future<List<CouponModel>> fetchMyCoupons() async {
    try {
      final userId = authState.profile?.id;
      if (userId == null) return [];

      final res = await supabase
          .from('coupons')
          .select('*, companies(name_en, name_ar, logo_url, cover_url, slug)')
          .eq('customer_id', userId)
          .order('year', ascending: false);

      return res
          .map((c) => CouponModel.fromMap(Map<String, dynamic>.from(c)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> claimCouponStep1(String couponId, String merchantPin) async {
    try {
      final res = await supabase.rpc('claim_coupon_step1', params: {
        'p_coupon_id': couponId,
        'p_merchant_pin': merchantPin,
      });
      if (res is List && res.isNotEmpty) {
        return Map<String, dynamic>.from(res.first);
      } else if (res is Map) {
        return Map<String, dynamic>.from(res);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> claimCouponStep2(String claimId, String customerPin) async {
    try {
      final res = await supabase.rpc('claim_coupon_step2', params: {
        'p_claim_id': claimId,
        'p_customer_pin': customerPin,
      });
      if (res is List && res.isNotEmpty) {
        return Map<String, dynamic>.from(res.first);
      } else if (res is Map) {
        return Map<String, dynamic>.from(res);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> cancelMyClaim(String claimId) async {
    try {
      await supabase.rpc('cancel_my_claim', params: {
        'p_claim_id': claimId,
      });
    } catch (e) {
      rethrow;
    }
  }
}
