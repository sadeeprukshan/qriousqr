import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';
import 'restaurants_repository.dart';

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  final String productId;

  const ProductDetailScreen({
    super.key,
    required this.slug,
    required this.productId,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Company? _company;
  Product? _product;
  bool _availableBogo = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final compRes = await supabase
          .from('companies')
          .select('*')
          .eq('slug', widget.slug)
          .single();
      _company = Company.fromMap(compRes);

      final prodRes = await supabase
          .from('products')
          .select('*')
          .eq('id', widget.productId)
          .single();
      _product = Product.fromMap(prodRes);

      // Check if user is premium and has an available coupon for this category
      if (authState.isPremium && _product?.couponCategory != null) {
        final couponRes = await supabase
            .from('coupons')
            .select('id')
            .eq('company_id', _company!.id)
            .eq('category', _product!.couponCategory!)
            .eq('status', 'available')
            .limit(1);
        if (couponRes.isNotEmpty) {
          _availableBogo = true;
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
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

    if (_product == null || _company == null) {
      return QScaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('⚠️', style: TextStyle(fontSize: 48)),
              const SizedBox(height: QSpacing.md),
              Text(
                isArabic ? 'المنتج غير موجود' : 'Product not found',
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

    final prodImg = _product!.imageUrl ??
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop';

    return Scaffold(
      backgroundColor: QColors.background,
      body: Stack(
        children: [
          // Scrollable Info
          SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero Image & Close Button
                Stack(
                  children: [
                    AspectRatio(
                      aspectRatio: 4 / 3,
                      child: Image.network(
                        prodImg,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 48,
                      left: isArabic ? null : 16,
                      right: isArabic ? 16 : null,
                      child: GestureDetector(
                        onTap: () => context.pop(),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.arrow_back,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                Padding(
                  padding: const EdgeInsets.all(QSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Price & Calorie row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${_company!.currencyCode} ${_product!.price.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: QColors.secondary,
                            ),
                          ),
                          if (_product!.calories != null)
                            Row(
                              children: [
                                const Icon(Icons.local_fire_department_outlined,
                                    color: QColors.primary, size: 20),
                                const SizedBox(width: 4),
                                Text(
                                  '${_product!.calories} ${isArabic ? 'سعرة' : 'kcal'}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: QColors.primary,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      const SizedBox(height: QSpacing.md),

                      // Name
                      Text(
                        isArabic ? _product!.nameAr : _product!.nameEn,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: QColors.text,
                        ),
                      ),
                      const SizedBox(height: QSpacing.sm),

                      // Description
                      if (_product!.descriptionEn != null || _product!.descriptionAr != null) ...[
                        Text(
                          (isArabic ? _product!.descriptionAr : _product!.descriptionEn) ?? '',
                          style: const TextStyle(
                            fontSize: 14,
                            color: QColors.textMuted,
                            height: 1.6,
                          ),
                        ),
                        const SizedBox(height: QSpacing.lg),
                      ],

                      // Allergens
                      if (_product!.allergens.isNotEmpty) ...[
                        Text(
                          isArabic ? 'مسببات الحساسية' : 'Allergens',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: QColors.text,
                          ),
                        ),
                        const SizedBox(height: QSpacing.xs),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _product!.allergens.map((allergen) {
                            return Chip(
                              backgroundColor: QColors.surface2,
                              side: const BorderSide(color: QColors.border),
                              label: Text(
                                allergen,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: QColors.text,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: QSpacing.lg),
                      ],

                      // Tags
                      if (_product!.tags.isNotEmpty) ...[
                        Text(
                          isArabic ? 'العلامات' : 'Tags',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: QColors.text,
                          ),
                        ),
                        const SizedBox(height: QSpacing.xs),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _product!.tags.map((tag) {
                            return Chip(
                              backgroundColor: QColors.primarySoft,
                              side: BorderSide.none,
                              label: Text(
                                tag,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: QColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Bottom Claim Sticky CTA
          if (_availableBogo)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: SafeArea(
                child: QButton.primary(
                  label: isArabic ? 'مطالبة بـ BOGO' : 'Claim BOGO',
                  onPressed: () {
                    // Navigate to Coupons tab and prefill restaurant + category parameters
                    final path = '/coupons?prefill_slug=${widget.slug}&prefill_category=${_product!.couponCategory}';
                    context.go(path);
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
