import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/widgets/upgrade_premium_card.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';
import 'restaurants_repository.dart';

class RestaurantScreen extends StatefulWidget {
  final String slug;

  const RestaurantScreen({
    super.key,
    required this.slug,
  });

  @override
  State<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends State<RestaurantScreen> {
  final _repository = RestaurantsRepository();
  final ScrollController _scrollController = ScrollController();
  final ScrollController _categoryScrollController = ScrollController();

  MenuData? _menuData;
  List<String> _availableCouponCategories = [];
  bool _isLoading = true;
  String? _activeCategory;
  int _scrollLockUntil = 0;

  final Map<String, GlobalKey> _sectionKeys = {};
  final Map<String, GlobalKey> _pillKeys = {};

  @override
  void initState() {
    super.initState();
    _loadMenu();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _categoryScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMenu() async {
    setState(() {
      _isLoading = true;
    });

    final data = await _repository.fetchMenu(widget.slug);
    if (data != null) {
      _menuData = data;
      
      // Fetch user's coupons for this restaurant if premium
      if (authState.isPremium) {
        await _fetchEligibleCoupons(data.company.id);
      }

      // Restore category scroll persistence
      final prefs = await SharedPreferences.getInstance();
      final savedCat = prefs.getString('menu-scroll:${widget.slug}:cat');
      final savedY = prefs.getDouble('menu-scroll:${widget.slug}:y');

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (data.categories.isNotEmpty) {
            _activeCategory = data.categories.first.id;
            if (savedCat != null && data.categories.any((c) => c.id == savedCat)) {
              _activeCategory = savedCat;
            }
          }
        });

        // Restore scroll position
        if (savedY != null && savedY > 0) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (_scrollController.hasClients) {
                _scrollController.jumpTo(savedY);
              }
            });
          });
        }
      }
    } else {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _fetchEligibleCoupons(String companyId) async {
    try {
      final res = await supabase
          .from('coupons')
          .select('category')
          .eq('company_id', companyId)
          .eq('status', 'available');

      setState(() {
        _availableCouponCategories = res
            .map((c) => c['category'] as String)
            .toList();
      });
    } catch (_) {}
  }

  void _onScroll() async {
    // Save scroll position for persistence
    if (_scrollController.hasClients) {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      await prefs.setDouble('menu-scroll:${widget.slug}:y', _scrollController.offset);
      if (_activeCategory != null) {
        await prefs.setString('menu-scroll:${widget.slug}:cat', _activeCategory!);
      }
    }

    if (!mounted) return;
    if (DateTime.now().millisecondsSinceEpoch < _scrollLockUntil) return;

    String? closestCategory;
    double minDistance = double.infinity;
    const double headerBottom = 160.0; // rough position where category header crosses sticky strip

    for (var entry in _sectionKeys.entries) {
      final key = entry.value;
      final context = key.currentContext;
      if (context != null && context.mounted) {
        final renderBox = context.findRenderObject() as RenderBox?;
        if (renderBox != null) {
          final position = renderBox.localToGlobal(Offset.zero);
          final distance = (position.dy - headerBottom).abs();
          if (position.dy < MediaQuery.of(context).size.height && distance < minDistance) {
            minDistance = distance;
            closestCategory = entry.key;
          }
        }
      }
    }

    if (closestCategory != null && closestCategory != _activeCategory) {
      setState(() {
        _activeCategory = closestCategory;
      });
      _scrollToActivePill();
    }
  }

  void _onCategoryTap(String categoryId) {
    final key = _sectionKeys[categoryId];
    final context = key?.currentContext;
    if (context != null) {
      _scrollLockUntil = DateTime.now().millisecondsSinceEpoch + 700;
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
      setState(() {
        _activeCategory = categoryId;
      });
      _scrollToActivePill();
    }
  }

  void _scrollToActivePill() {
    final key = _pillKeys[_activeCategory];
    final context = key?.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        alignment: 0.5,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _launchUrl(String urlString) async {
    final uri = Uri.parse(urlString);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
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

    if (_menuData == null) {
      return QScaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('⚠️', style: TextStyle(fontSize: 48)),
              const SizedBox(height: QSpacing.md),
              Text(
                isArabic ? 'لم نتمكن من العثور على المطعم' : 'Restaurant not found',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: QSpacing.sm),
              TextButton(
                onPressed: () => context.pop(),
                child: Text(isArabic ? 'العودة' : 'Back'),
              ),
            ],
          ),
        ),
      );
    }

    final company = _menuData!.company;
    final coverUrl = company.coverUrl ??
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';
    final logoUrl = company.logoUrl ??
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';

    // Group products by category
    final Map<String, List<Product>> groupedProducts = {};
    for (var cat in _menuData!.categories) {
      groupedProducts[cat.id] = _menuData!.products
          .where((p) => p.categoryId == cat.id)
          .toList();
    }

    return Scaffold(
      backgroundColor: QColors.background,
      body: Stack(
        children: [
          // Scrollable content
          CustomScrollView(
            controller: _scrollController,
            slivers: [
              // Hero cover photo
              SliverAppBar(
                expandedHeight: 200,
                pinned: true,
                backgroundColor: QColors.surface,
                iconTheme: const IconThemeData(color: Colors.white),
                flexibleSpace: FlexibleSpaceBar(
                  background: Image.network(
                    coverUrl,
                    fit: BoxFit.cover,
                  ),
                ),
              ),

              // Restaurant Info header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(QSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Logo
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: const [
                                BoxShadow(
                                  // ignore: deprecated_member_use
                                  color: Colors.black12,
                                  blurRadius: 6,
                                  offset: Offset(0, 3),
                                )
                              ],
                              image: DecorationImage(
                                image: NetworkImage(logoUrl),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(width: QSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isArabic ? company.nameAr : company.nameEn,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    color: QColors.text,
                                  ),
                                ),
                                if (company.descriptionEn != null || company.descriptionAr != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    (isArabic ? company.descriptionAr : company.descriptionEn) ?? '',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: QColors.textMuted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: QSpacing.md),
                      // Contact links
                      Row(
                        children: [
                          if (company.phone != null) ...[
                            IconButton(
                              icon: const Icon(Icons.phone_outlined, color: QColors.secondary),
                              onPressed: () => _launchUrl('tel:${company.phone}'),
                            ),
                          ],
                          if (company.whatsapp != null) ...[
                            IconButton(
                              icon: const Icon(Icons.chat_bubble_outline, color: QColors.secondary),
                              onPressed: () => _launchUrl('https://wa.me/${company.whatsapp}'),
                            ),
                          ],
                        ],
                      ),

                      // Upgrade banner for Regular users
                      ListenableBuilder(
                        listenable: authState,
                        builder: (context, _) {
                          if (authState.isPremium) return const SizedBox.shrink();
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: QSpacing.md),
                            child: UpgradePremiumCard(),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Sticky Category Strip
              SliverPersistentHeader(
                pinned: true,
                delegate: _StickyCategoryDelegate(
                  child: Container(
                    height: 64,
                    decoration: const BoxDecoration(
                      color: QColors.background,
                      border: Border(
                        bottom: BorderSide(color: QColors.border),
                      ),
                    ),
                    child: ListView.builder(
                      controller: _categoryScrollController,
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: QSpacing.lg),
                      itemCount: _menuData!.categories.length,
                      itemBuilder: (context, index) {
                        final cat = _menuData!.categories[index];
                        final isSelected = cat.id == _activeCategory;
                        _pillKeys[cat.id] = GlobalKey();

                        return Padding(
                          key: _pillKeys[cat.id],
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                          child: GestureDetector(
                            onTap: () => _onCategoryTap(cat.id),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: isSelected ? QColors.primary : QColors.surface,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected ? QColors.primary : QColors.border,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                isArabic ? cat.nameAr : cat.nameEn,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : QColors.text,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),

              // Product Groups List
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final cat = _menuData!.categories[index];
                    final catProducts = groupedProducts[cat.id] ?? [];
                    if (catProducts.isEmpty) return const SizedBox.shrink();

                    _sectionKeys[cat.id] = GlobalKey();

                    return Column(
                      key: _sectionKeys[cat.id],
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Category Header
                        Padding(
                          padding: const EdgeInsets.fromLTRB(
                            QSpacing.lg,
                            QSpacing.lg,
                            QSpacing.lg,
                            QSpacing.sm,
                          ),
                          child: Text(
                            isArabic ? cat.nameAr : cat.nameEn,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: QColors.text,
                            ),
                          ),
                        ),
                        // Product cards
                        ...catProducts.map((product) {
                          final prodImg = product.imageUrl ??
                              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&h=150&fit=crop';
                          
                          // Check eligibility for BOGO tag
                          final isBogoEligible = authState.isPremium &&
                              product.couponCategory != null &&
                              _availableCouponCategories.contains(product.couponCategory);

                          return Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: QSpacing.lg,
                              vertical: 6,
                            ),
                            child: QCard(
                              padding: EdgeInsets.zero,
                              onTap: () {
                                context.push(
                                  '/restaurants/restaurant/${widget.slug}/product/${product.id}',
                                );
                              },
                              child: Row(
                                children: [
                                  // Product image
                                  ClipRRect(
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(16),
                                      bottomLeft: Radius.circular(16),
                                    ),
                                    child: Image.network(
                                      prodImg,
                                      width: 100,
                                      height: 100,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: QSpacing.md),
                                  // Product Info
                                  Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.all(QSpacing.sm),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            isArabic ? product.nameAr : product.nameEn,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                              color: QColors.text,
                                            ),
                                          ),
                                          if (product.descriptionEn != null || product.descriptionAr != null) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              (isArabic ? product.descriptionAr : product.descriptionEn) ?? '',
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: QColors.textMuted,
                                              ),
                                            ),
                                          ],
                                          const SizedBox(height: 6),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                '${company.currencyCode} ${product.price.toStringAsFixed(2)}',
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w800,
                                                  color: QColors.secondary,
                                                ),
                                              ),
                                              if (isBogoEligible)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 2,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: QColors.primarySoft,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    isArabic ? 'مؤهل لـ BOGO' : 'BOGO ELIGIBLE',
                                                    style: const TextStyle(
                                                      color: QColors.primary,
                                                      fontSize: 9,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    );
                  },
                  childCount: _menuData!.categories.length,
                ),
              ),
              
              // Bottom spacing
              const SliverToBoxAdapter(
                child: SizedBox(height: 120),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StickyCategoryDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _StickyCategoryDelegate({required this.child});

  @override
  double get minExtent => 64.0;

  @override
  double get maxExtent => 64.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return child;
  }

  @override
  bool shouldRebuild(covariant _StickyCategoryDelegate oldDelegate) {
    return false;
  }
}
