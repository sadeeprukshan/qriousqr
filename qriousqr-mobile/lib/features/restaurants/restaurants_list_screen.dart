import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/language_state.dart';
import 'restaurants_repository.dart';

class RestaurantsListScreen extends StatefulWidget {
  const RestaurantsListScreen({super.key});

  @override
  State<RestaurantsListScreen> createState() => _RestaurantsListScreenState();
}

class _RestaurantsListScreenState extends State<RestaurantsListScreen> {
  final _repository = RestaurantsRepository();
  List<RestaurantSummary> _restaurants = [];
  Map<String, int> _couponCounts = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    final list = await _repository.listAll();
    final counts = await _fetchCouponCounts();

    if (mounted) {
      setState(() {
        _restaurants = list;
        _couponCounts = counts;
        _isLoading = false;
      });
    }
  }

  Future<Map<String, int>> _fetchCouponCounts() async {
    try {
      final currentYear = DateTime.now().year;
      final res = await supabase
          .from('coupons')
          .select('company_id')
          .eq('status', 'available')
          .eq('year', currentYear);

      final counts = <String, int>{};
      for (var item in res) {
        final compId = item['company_id'] as String?;
        if (compId != null) {
          counts[compId] = (counts[compId] ?? 0) + 1;
        }
      }
      return counts;
    } catch (_) {
      return {};
    }
  }

  String _getFlagEmoji(String countryCode) {
    if (countryCode.length != 2) return '🌐';
    final int firstLetter = countryCode.toUpperCase().codeUnitAt(0) - 0x41 + 0x1F1E6;
    final int secondLetter = countryCode.toUpperCase().codeUnitAt(1) - 0x41 + 0x1F1E6;
    return String.fromCharCode(firstLetter) + String.fromCharCode(secondLetter);
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;

    return QScaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Custom App Bar
            ListenableBuilder(
              listenable: languageState,
              builder: (context, _) {
                return Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: QSpacing.lg,
                    vertical: QSpacing.md,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'QriousQR',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: QColors.primary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => languageState.toggle(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: QSpacing.sm,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: QColors.surface2,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: QColors.border),
                          ),
                          child: Text(
                            isArabic ? 'EN' : 'ع',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: QColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            // Content
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: QColors.primary,
                      ),
                    )
                  : RefreshIndicator(
                      color: QColors.primary,
                      onRefresh: _loadData,
                      child: _restaurants.isEmpty
                          ? ListView(
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                                Center(
                                  child: Column(
                                    children: [
                                      const Text(
                                        '🍔',
                                        style: TextStyle(fontSize: 48),
                                      ),
                                      const SizedBox(height: QSpacing.sm),
                                      Text(
                                        isArabic
                                            ? 'لا توجد مطاعم متاحة حالياً.'
                                            : 'No restaurants available yet.',
                                        style: const TextStyle(
                                          color: QColors.textMuted,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListenableBuilder(
                              listenable: languageState,
                              builder: (context, _) {
                                return ListView.builder(
                                  padding: const EdgeInsets.fromLTRB(
                                    QSpacing.lg,
                                    0,
                                    QSpacing.lg,
                                    100, // Bottom navigation padding
                                  ),
                                  itemCount: _restaurants.length,
                                  itemBuilder: (context, index) {
                                    final rest = _restaurants[index];
                                    final coverUrl = rest.coverUrl ??
                                        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';
                                    final logoUrl = rest.logoUrl ??
                                        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';
                                    final count = _couponCounts[rest.id] ?? 0;

                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: QSpacing.lg),
                                      child: QCard(
                                        padding: EdgeInsets.zero,
                                        onTap: () {
                                          context.push(
                                            '/restaurants/restaurant/${rest.slug}',
                                          );
                                        },
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            // Cover Photo
                                            Stack(
                                              children: [
                                                ClipRRect(
                                                  borderRadius: const BorderRadius.only(
                                                    topLeft: Radius.circular(16),
                                                    topRight: Radius.circular(16),
                                                  ),
                                                  child: AspectRatio(
                                                    aspectRatio: 16 / 9,
                                                    child: Image.network(
                                                      coverUrl,
                                                      fit: BoxFit.cover,
                                                    ),
                                                  ),
                                                ),
                                                // Offers count badge
                                                if (count > 0)
                                                  Positioned(
                                                    top: 12,
                                                    right: isArabic ? null : 12,
                                                    left: isArabic ? 12 : null,
                                                    child: Container(
                                                      padding: const EdgeInsets.symmetric(
                                                        horizontal: 10,
                                                        vertical: 4,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFF22C55E),
                                                        borderRadius: BorderRadius.circular(12),
                                                        boxShadow: const [
                                                          BoxShadow(
                                                            // ignore: deprecated_member_use
                                                            color: Colors.black26,
                                                            blurRadius: 4,
                                                            offset: Offset(0, 2),
                                                          )
                                                        ],
                                                      ),
                                                      child: Text(
                                                        isArabic
                                                            ? '$count عروض'
                                                            : '$count offers',
                                                        style: const TextStyle(
                                                          color: Colors.white,
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w800,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                              ],
                                            ),

                                            // Details section
                                            Padding(
                                              padding: const EdgeInsets.all(QSpacing.md),
                                              child: Row(
                                                children: [
                                                  // Logo
                                                  Container(
                                                    width: 48,
                                                    height: 48,
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      border: Border.all(
                                                        color: QColors.border,
                                                        width: 2,
                                                      ),
                                                      image: DecorationImage(
                                                        image: NetworkImage(logoUrl),
                                                        fit: BoxFit.cover,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: QSpacing.md),
                                                  // Title
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Row(
                                                          children: [
                                                            Expanded(
                                                              child: Text(
                                                                isArabic
                                                                    ? rest.nameAr
                                                                    : rest.nameEn,
                                                                style: const TextStyle(
                                                                  fontSize: 16,
                                                                  fontWeight: FontWeight.w800,
                                                                  color: QColors.text,
                                                                ),
                                                              ),
                                                            ),
                                                            const SizedBox(width: 4),
                                                            Text(
                                                              _getFlagEmoji(rest.countryCode),
                                                              style: const TextStyle(
                                                                fontSize: 16,
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
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
