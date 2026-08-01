import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/widgets/order_status_pill.dart';
import '../../shared/widgets/customer_nav_shell.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';
import 'orders_repository.dart';

class CustomerOrdersScreen extends StatefulWidget {
  const CustomerOrdersScreen({super.key});

  @override
  State<CustomerOrdersScreen> createState() => _CustomerOrdersScreenState();
}

class _CustomerOrdersScreenState extends State<CustomerOrdersScreen> with SingleTickerProviderStateMixin {
  final _repository = OrdersRepository();
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  RealtimeChannel? _realtimeChannel;
  late TabController _tabController;

  List<OrderModel> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _initNotifications();
    _loadOrders();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initNotifications() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    await _localNotifications.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    // Request permissions dynamically
    final platform = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (platform != null) {
      await platform.requestNotificationsPermission();
    }
  }

  Future<void> _showNotification(String title, String body) async {
    const androidDetails = AndroidNotificationDetails(
      'order_channel',
      'Order Status Notifications',
      channelDescription: 'Notifications regarding your pickup orders.',
      importance: Importance.max,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }

  Future<void> _loadOrders() async {
    if (authState.profile == null) return;
    
    final data = await _repository.myOrders();
    final count = await _repository.activeCount();

    if (mounted) {
      // Check for transitioned ready orders to notify
      if (_orders.isNotEmpty) {
        for (var newOrder in data) {
          final oldOrder = _orders.firstWhere((o) => o.id == newOrder.id, orElse: () => newOrder);
          if (oldOrder.status == 'pending' && newOrder.status == 'ready') {
            final isArabic = languageState.isArabic;
            final restName = isArabic ? newOrder.companyNameAr : newOrder.companyNameEn;
            final msg = isArabic
                ? 'طلبك #${newOrder.orderNumber} في $restName جاهز للاستلام!'
                : 'Your order #${newOrder.orderNumber} at $restName is ready for pickup!';
            
            _showNotification(restName, msg);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(msg),
                backgroundColor: QColors.secondary,
              ),
            );
            HapticFeedback.mediumImpact();
          }
        }
      }

      setState(() {
        _orders = data;
        activeOrdersCountNotifier.value = count;
        _isLoading = false;
      });
    }
  }

  void _subscribeRealtime() {
    if (authState.profile == null) return;

    _realtimeChannel = supabase.channel('customer_orders_${authState.profile!.id}')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'orders',
        callback: (payload) {
          _loadOrders();
        },
      )
      .subscribe();
  }

  String _timeAgo(DateTime dt) {
    final isArabic = languageState.isArabic;
    final diff = DateTime.now().difference(dt);
    if (diff.inDays > 0) return isArabic ? 'قبل ${diff.inDays} يوم' : '${diff.inDays}d ago';
    if (diff.inHours > 0) return isArabic ? 'قبل ${diff.inHours} ساعة' : '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return isArabic ? 'قبل ${diff.inMinutes} دقيقة' : '${diff.inMinutes}m ago';
    return isArabic ? 'الآن' : 'Just now';
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;

    if (_isLoading) {
      return const QScaffold(
        body: Center(
          child: CircularProgressIndicator(color: QColors.primary),
        ),
      );
    }

    final activeOrders = _orders.where((o) => o.isActive).toList();
    final deliveredOrders = _orders.where((o) => o.status == 'delivered').toList();
    final cancelledOrders = _orders.where((o) => o.status == 'cancelled').toList();

    return QScaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Padding(
              padding: const EdgeInsets.all(QSpacing.lg),
              child: Text(
                isArabic ? 'طلباتي' : 'My Orders',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: QColors.text,
                ),
              ),
            ),

            // Tab bar
            TabBar(
              controller: _tabController,
              indicatorColor: QColors.primary,
              labelColor: QColors.primary,
              unselectedLabelColor: QColors.textMuted,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(text: isArabic ? 'نشط' : 'Active'),
                Tab(text: isArabic ? 'تم الاستلام' : 'Delivered'),
                Tab(text: isArabic ? 'ملغى' : 'Cancelled'),
              ],
            ),

            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildOrdersList(activeOrders, isArabic ? 'لا توجد طلبات نشطة حالياً' : 'No active orders'),
                  _buildOrdersList(deliveredOrders, isArabic ? 'لا توجد طلبات مستلمة' : 'No delivered orders'),
                  _buildOrdersList(cancelledOrders, isArabic ? 'لا توجد طلبات ملغاة' : 'No cancelled orders'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersList(List<OrderModel> orders, String emptyMsg) {
    final isArabic = languageState.isArabic;
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🛍️', style: TextStyle(fontSize: 48)),
            const SizedBox(height: QSpacing.md),
            Text(
              emptyMsg,
              style: const TextStyle(color: QColors.textMuted, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: QColors.primary,
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(QSpacing.lg, QSpacing.md, QSpacing.lg, 100),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          final restName = isArabic ? order.companyNameAr : order.companyNameEn;
          final logoUrl = order.companyLogoUrl ??
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';

          return Padding(
            padding: const EdgeInsets.only(bottom: QSpacing.md),
            child: QCard(
              padding: const EdgeInsets.all(QSpacing.md),
              onTap: () {
                context.push('/restaurants/restaurant/${order.companySlug}');
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Restaurant Row
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
                      Expanded(
                        child: Text(
                          restName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: QColors.text,
                          ),
                        ),
                      ),
                      OrderStatusPill(status: order.status),
                    ],
                  ),
                  const Divider(height: 24, color: QColors.divider),
                  
                  // Order Details
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '#${order.orderNumber}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          color: QColors.text,
                        ),
                      ),
                      Text(
                        _timeAgo(order.createdAt),
                        style: const TextStyle(
                          fontSize: 12,
                          color: QColors.textSoft,
                        ),
                      ),
                    ],
                  ),
                  
                  // OTP Block for Ready orders
                  if (order.status == 'ready') ...[
                    const SizedBox(height: QSpacing.md),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(QSpacing.md),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F4FD),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFB3E5FC)),
                      ),
                      child: Column(
                        children: [
                          Text(
                            isArabic ? 'اعرض رمز الاستلام (OTP) للموظف' : 'Show this OTP to the operator',
                            style: const TextStyle(
                              fontSize: 12,
                              color: QColors.secondary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            order.otp,
                            style: const TextStyle(
                              fontSize: 28,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w900,
                              color: QColors.secondary,
                              letterSpacing: 6,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isArabic ? 'سيقوم الموظف بإدخال الرمز لإكمال الاستلام' : 'The operator will enter it to complete pickup',
                            style: const TextStyle(
                              fontSize: 11,
                              color: QColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
