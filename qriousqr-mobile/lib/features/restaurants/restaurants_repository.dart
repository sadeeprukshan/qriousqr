import '../../config/supabase_client.dart';

class RestaurantSummary {
  final String id;
  final String slug;
  final String nameEn;
  final String nameAr;
  final String? logoUrl;
  final String? coverUrl;
  final String primaryColor;
  final String countryCode;

  RestaurantSummary({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.nameAr,
    this.logoUrl,
    this.coverUrl,
    required this.primaryColor,
    required this.countryCode,
  });

  factory RestaurantSummary.fromMap(Map<String, dynamic> m) {
    return RestaurantSummary(
      id: m['id'] ?? '',
      slug: m['slug'] ?? '',
      nameEn: m['name_en'] ?? '',
      nameAr: m['name_ar'] ?? '',
      logoUrl: m['logo_url'] as String?,
      coverUrl: m['cover_url'] as String?,
      primaryColor: m['primary_color'] ?? '#FF5722',
      countryCode: m['country_code'] ?? 'US',
    );
  }
}

class Company {
  final String id;
  final String slug;
  final String nameEn;
  final String nameAr;
  final String? descriptionEn;
  final String? descriptionAr;
  final String? logoUrl;
  final String? coverUrl;
  final String primaryColor;
  final String secondaryColor;
  final String currencyCode;
  final String countryCode;
  final String? whatsapp;
  final String? phone;

  Company({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.nameAr,
    this.descriptionEn,
    this.descriptionAr,
    this.logoUrl,
    this.coverUrl,
    required this.primaryColor,
    required this.secondaryColor,
    required this.currencyCode,
    required this.countryCode,
    this.whatsapp,
    this.phone,
  });

  factory Company.fromMap(Map<String, dynamic> m) {
    return Company(
      id: m['id'] ?? '',
      slug: m['slug'] ?? '',
      nameEn: m['name_en'] ?? '',
      nameAr: m['name_ar'] ?? '',
      descriptionEn: m['description_en'] as String?,
      descriptionAr: m['description_ar'] as String?,
      logoUrl: m['logo_url'] as String?,
      coverUrl: m['cover_url'] as String?,
      primaryColor: m['primary_color'] ?? m['theme_color'] ?? '#FF5722',
      secondaryColor: m['secondary_color'] ?? '#0E7C7B',
      currencyCode: m['currency_code'] ?? 'USD',
      countryCode: m['country_code'] ?? 'US',
      whatsapp: m['whatsapp'] as String?,
      phone: m['phone'] as String?,
    );
  }
}

class Branch {
  final String id;
  final String slug;
  final String nameEn;
  final String nameAr;
  final bool isDefault;
  final String? addressEn;
  final String? addressAr;
  final String? phone;
  final String? whatsapp;

  Branch({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.nameAr,
    required this.isDefault,
    this.addressEn,
    this.addressAr,
    this.phone,
    this.whatsapp,
  });

  factory Branch.fromMap(Map<String, dynamic> m) {
    return Branch(
      id: m['id'] ?? '',
      slug: m['slug'] ?? '',
      nameEn: m['name_en'] ?? '',
      nameAr: m['name_ar'] ?? '',
      isDefault: m['is_default'] ?? false,
      addressEn: m['address_en'] as String?,
      addressAr: m['address_ar'] as String?,
      phone: m['phone'] as String?,
      whatsapp: m['whatsapp'] as String?,
    );
  }
}

class Category {
  final String id;
  final String companyId;
  final String branchId;
  final String nameEn;
  final String nameAr;
  final int sortOrder;
  final String? imageUrl;

  Category({
    required this.id,
    required this.companyId,
    required this.branchId,
    required this.nameEn,
    required this.nameAr,
    required this.sortOrder,
    this.imageUrl,
  });

  factory Category.fromMap(Map<String, dynamic> m) {
    return Category(
      id: m['id'] ?? '',
      companyId: m['company_id'] ?? '',
      branchId: m['branch_id'] ?? '',
      nameEn: m['name_en'] ?? '',
      nameAr: m['name_ar'] ?? '',
      sortOrder: m['sort_order'] ?? 0,
      imageUrl: m['image_url'] as String?,
    );
  }
}

class Product {
  final String id;
  final String companyId;
  final String branchId;
  final String categoryId;
  final String nameEn;
  final String nameAr;
  final String? descriptionEn;
  final String? descriptionAr;
  final double price;
  final int? calories;
  final bool isAvailable;
  final String? imageUrl;
  final List<String> tags;
  final List<String> allergens;
  final String? couponCategory;

  Product({
    required this.id,
    required this.companyId,
    required this.branchId,
    required this.categoryId,
    required this.nameEn,
    required this.nameAr,
    this.descriptionEn,
    this.descriptionAr,
    required this.price,
    this.calories,
    required this.isAvailable,
    this.imageUrl,
    required this.tags,
    required this.allergens,
    this.couponCategory,
  });

  factory Product.fromMap(Map<String, dynamic> m) {
    return Product(
      id: m['id'] ?? '',
      companyId: m['company_id'] ?? '',
      branchId: m['branch_id'] ?? '',
      categoryId: m['category_id'] ?? '',
      nameEn: m['name_en'] ?? '',
      nameAr: m['name_ar'] ?? '',
      descriptionEn: m['description_en'] as String?,
      descriptionAr: m['description_ar'] as String?,
      price: (m['price'] as num?)?.toDouble() ?? 0.0,
      calories: m['calories'] as int?,
      isAvailable: m['is_available'] ?? true,
      imageUrl: m['image_url'] as String?,
      tags: List<String>.from(m['tags'] ?? []),
      allergens: List<String>.from(m['allergens'] ?? []),
      couponCategory: m['coupon_category'] as String?,
    );
  }
}

class MenuData {
  final Company company;
  final Branch? branch;
  final List<Category> categories;
  final List<Product> products;
  final List<Branch> branches;

  MenuData({
    required this.company,
    this.branch,
    required this.categories,
    required this.products,
    required this.branches,
  });
}

class RestaurantsRepository {
  Future<List<RestaurantSummary>> listAll() async {
    try {
      final res = await supabase.rpc('customer_list_restaurants');
      if (res is List) {
        return res
            .map((r) => RestaurantSummary.fromMap(Map<String, dynamic>.from(r)))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<MenuData?> fetchMenu(String slug, {String? branchSlug}) async {
    try {
      final companyRes = await supabase
          .from('companies')
          .select('*')
          .eq('slug', slug)
          .single();

      final company = Company.fromMap(companyRes);

      final responses = await Future.wait([
        supabase
            .from('branches')
            .select('*')
            .eq('company_id', company.id)
            .eq('is_active', true)
            .order('sort_order'),
        supabase
            .from('categories')
            .select('*')
            .eq('company_id', company.id)
            .order('sort_order'),
        supabase
            .from('products')
            .select('*')
            .eq('company_id', company.id)
            .eq('is_available', true)
      ]);

      final branches = (responses[0] as List)
          .map((b) => Branch.fromMap(Map<String, dynamic>.from(b)))
          .toList();

      if (branches.isEmpty) {
        return MenuData(
          company: company,
          branch: null,
          categories: [],
          products: [],
          branches: [],
        );
      }

      final branch = branches.firstWhere(
        (b) => b.slug == branchSlug,
        orElse: () => branches.firstWhere((b) => b.isDefault, orElse: () => branches.first),
      );

      final categories = (responses[1] as List)
          .map((c) => Category.fromMap(Map<String, dynamic>.from(c)))
          .where((c) => c.branchId == branch.id)
          .toList();

      final products = (responses[2] as List)
          .map((p) => Product.fromMap(Map<String, dynamic>.from(p)))
          .where((p) => p.branchId == branch.id)
          .toList();

      // Sort products
      products.sort((a, b) {
        return a.id.compareTo(b.id);
      });

      return MenuData(
        company: company,
        branch: branch,
        categories: categories,
        products: products,
        branches: branches,
      );
    } catch (_) {
      return null;
    }
  }
}
