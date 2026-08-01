import '../../config/supabase_client.dart';

class OrderModel {
  final String id;
  final String orderNumber;
  final String status; // 'pending' | 'ready' | 'delivered' | 'cancelled'
  final String otp;
  final String companyId;
  final String companySlug;
  final String companyNameEn;
  final String companyNameAr;
  final String? companyLogoUrl;
  final DateTime createdAt;
  final DateTime? readyAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.otp,
    required this.companyId,
    required this.companySlug,
    required this.companyNameEn,
    required this.companyNameAr,
    this.companyLogoUrl,
    required this.createdAt,
    this.readyAt,
    this.deliveredAt,
    this.cancelledAt,
  });

  bool get isActive => status == 'pending' || status == 'ready';

  factory OrderModel.fromMap(Map<String, dynamic> m) {
    return OrderModel(
      id: m['id'] ?? '',
      orderNumber: m['order_number'] ?? '',
      status: m['status'] ?? 'pending',
      otp: m['otp'] ?? '',
      companyId: m['company_id'] ?? '',
      companySlug: m['company_slug'] ?? '',
      companyNameEn: m['company_name_en'] ?? '',
      companyNameAr: m['company_name_ar'] ?? '',
      companyLogoUrl: m['company_logo_url'] as String?,
      createdAt: DateTime.parse(m['created_at'] ?? DateTime.now().toIso8601String()),
      readyAt: m['ready_at'] != null ? DateTime.parse(m['ready_at']) : null,
      deliveredAt: m['delivered_at'] != null ? DateTime.parse(m['delivered_at']) : null,
      cancelledAt: m['cancelled_at'] != null ? DateTime.parse(m['cancelled_at']) : null,
    );
  }
}

class OrdersRepository {
  Future<List<OrderModel>> myOrders({int? limit}) async {
    try {
      final res = await supabase.rpc('customer_my_orders', params: {
        'p_limit': limit,
      });
      if (res is List) {
        return res
            .map((r) => OrderModel.fromMap(Map<String, dynamic>.from(r)))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<int> activeCount() async {
    try {
      final res = await supabase.rpc('customer_active_orders_count');
      return (res as int?) ?? 0;
    } catch (_) {
      return 0;
    }
  }
}
