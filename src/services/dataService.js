import { supabase, isMockMode } from '../supabaseClient.js';

export const ALLERGENS = [
  { slug: 'gluten', name_en: 'Gluten', name_ar: 'الجلوتين', icon: '🌾', sort_order: 1 },
  { slug: 'crustaceans', name_en: 'Crustaceans', name_ar: 'القشريات', icon: '🦐', sort_order: 2 },
  { slug: 'eggs', name_en: 'Eggs', name_ar: 'البيض', icon: '🥚', sort_order: 3 },
  { slug: 'fish', name_en: 'Fish', name_ar: 'الأسماك', icon: '🐟', sort_order: 4 },
  { slug: 'peanuts', name_en: 'Peanuts', name_ar: 'الفول السوداني', icon: '🥜', sort_order: 5 },
  { slug: 'soy', name_en: 'Soy', name_ar: 'الصويا', icon: '🫘', sort_order: 6 },
  { slug: 'dairy', name_en: 'Dairy', name_ar: 'الألبان', icon: '🥛', sort_order: 7 },
  { slug: 'nuts', name_en: 'Tree nuts', name_ar: 'المكسرات', icon: '🌰', sort_order: 8 },
  { slug: 'celery', name_en: 'Celery', name_ar: 'الكرفس', icon: '🌿', sort_order: 9 },
  { slug: 'mustard', name_en: 'Mustard', name_ar: 'الخردل', icon: '🌭', sort_order: 10 },
  { slug: 'sesame', name_en: 'Sesame', name_ar: 'السمسم', icon: '🌱', sort_order: 11 },
  { slug: 'sulphites', name_en: 'Sulphites', name_ar: 'الكبريتات', icon: '🧪', sort_order: 12 },
  { slug: 'lupin', name_en: 'Lupin', name_ar: 'الترمس', icon: '🌼', sort_order: 13 },
  { slug: 'molluscs', name_en: 'Molluscs', name_ar: 'الرخويات', icon: '🐚', sort_order: 14 }
];

export const KANTAMI_TAGS = [
  { slug: 'chef-pick', name_en: "Chef's pick", name_ar: 'اختيار الشيف', color: '#C0392B' },
  { slug: 'spicy', name_en: 'Spicy', name_ar: 'حار', color: '#E74C3C' },
  { slug: 'vegetarian', name_en: 'Vegetarian', name_ar: 'نباتي', color: '#27AE60' },
  { slug: 'vegan', name_en: 'Vegan', name_ar: 'نباتي صرف', color: '#16A085' },
  { slug: 'sweet', name_en: 'Sweet', name_ar: 'حلو', color: '#F39C12' },
  { slug: 'refreshing', name_en: 'Refreshing', name_ar: 'منعش', color: '#3498DB' }
];

const SEED = {
  company: {
    id: 'kantami',
    slug: 'kantami',
    name_en: 'Kantami',
    name_ar: 'كنتمي',
    description_en: 'Authentic Lebanese cuisine, served warm.',
    description_ar: 'مأكولات لبنانية أصيلة، تقدم بدفء.',
    logo_url: '/seed-images/kantami/logo.webp',
    cover_url: '/seed-images/kantami/cover.webp',
    theme_color: '#C0392B',
    secondary_color: '#0E7C7B',
    text_color: '#14110F',
    background_color: '#FAF8F5',
    currency_code: 'USD',
    country_code: 'LB',
    whatsapp: '+9611234567',
    phone: '+9611234567',
    google_map: 'https://maps.google.com/?q=Beirut',
    instagram: 'https://instagram.com/kantami',
    snapchat: '',
    twitter: '',
    tags: KANTAMI_TAGS,
    branches: [
      {
        id: 'branch-main',
        slug: 'main',
        name_en: 'Main branch',
        name_ar: 'الفرع الرئيسي',
        is_default: true,
        is_active: true,
        address_en: 'Beirut, Lebanon',
        address_ar: 'بيروت، لبنان',
        phone: '+9611234567',
        whatsapp: '+9611234567',
        google_map: 'https://maps.google.com/?q=Beirut',
        cover_url: '',
        hours: {
          mon: { open: '09:00', close: '23:00', closed: false },
          tue: { open: '09:00', close: '23:00', closed: false },
          wed: { open: '09:00', close: '23:00', closed: false },
          thu: { open: '09:00', close: '23:00', closed: false },
          fri: { open: '09:00', close: '23:00', closed: false },
          sat: { open: '09:00', close: '23:00', closed: false },
          sun: { open: '09:00', close: '23:00', closed: false }
        }
      }
    ]
  },
  categories: [
    { id: 'cat-1', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Mezze', name_ar: 'مازة', sort_order: 1, image_url: '/seed-images/kantami/categories/mezze.webp' },
    { id: 'cat-2', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Shawarma', name_ar: 'شاورما', sort_order: 2, image_url: '/seed-images/kantami/categories/shawarma.webp' },
    { id: 'cat-3', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Grills', name_ar: 'مشاوي', sort_order: 3, image_url: '/seed-images/kantami/categories/grills.webp' },
    { id: 'cat-4', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Salads', name_ar: 'سلطات', sort_order: 4, image_url: '/seed-images/kantami/categories/salads.webp' },
    { id: 'cat-5', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Desserts', name_ar: 'حلويات', sort_order: 5, image_url: '/seed-images/kantami/categories/desserts.webp' },
    { id: 'cat-6', company_id: 'kantami', branch_id: 'branch-main', name_en: 'Beverages', name_ar: 'مشروبات', sort_order: 6, image_url: '/seed-images/kantami/categories/beverages.webp' }
  ],
  products: [
    {
      id: 'p-1', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-1',
      name_en: 'Hummus', name_ar: 'حمص',
      description_en: 'Creamy chickpea dip with tahini, lemon, and olive oil.',
      description_ar: 'حمص كريمي بطحينة وليمون وزيت زيتون.',
      price: 18, calories: 320, is_available: true,
      image_url: '/seed-images/kantami/products/hummus.webp',
      tags: ['vegetarian'], allergens: ['sesame'], sort_order: 0
    },
    {
      id: 'p-2', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-1',
      name_en: 'Tabbouleh', name_ar: 'تبولة',
      description_en: 'Parsley salad with bulgur, tomato, mint, and lemon.',
      description_ar: 'سلطة بقدونس مع برغل وطماطم ونعناع وليمون.',
      price: 22, calories: 180, is_available: true,
      image_url: '/seed-images/kantami/products/tabbouleh.webp',
      tags: ['vegetarian'], allergens: ['sesame'], sort_order: 1
    },
    {
      id: 'p-3', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-1',
      name_en: 'Falafel', name_ar: 'فلافل',
      description_en: 'Crispy fried chickpea fritters with tahini sauce.',
      description_ar: 'أقراص حمص مقلية مقرمشة مع صلصة الطحينة.',
      price: 20, calories: 350, is_available: true,
      image_url: '/seed-images/kantami/products/falafel.webp',
      tags: ['vegetarian'], allergens: ['sesame'], sort_order: 2
    },
    {
      id: 'p-4', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-2',
      name_en: 'Chicken Shawarma', name_ar: 'شاورما دجاج',
      description_en: 'Marinated chicken in saj bread with garlic sauce and pickles.',
      description_ar: 'دجاج متبل في خبز صاج مع صلصة ثوم ومخللات.',
      price: 32, calories: 540, is_available: true,
      image_url: '/seed-images/kantami/products/chicken-shawarma.webp',
      tags: ['spicy'], allergens: ['gluten', 'dairy'], sort_order: 0
    },
    {
      id: 'p-5', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-2',
      name_en: 'Beef Shawarma', name_ar: 'شاورما لحم',
      description_en: 'Slow-roasted beef shawarma with tahini and sumac onions.',
      description_ar: 'شاورما لحم مشوية ببطء مع طحينة وبصل بالسماق.',
      price: 38, calories: 620, is_available: true,
      image_url: '/seed-images/kantami/products/beef-shawarma.webp',
      tags: ['spicy'], allergens: ['gluten', 'dairy'], sort_order: 1
    },
    {
      id: 'p-6', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-3',
      name_en: 'Mixed Grill', name_ar: 'مشاوي مشكلة',
      description_en: 'Lamb kofta, shish taouk, and lamb kebab with grilled vegetables.',
      description_ar: 'كفتة لحم وشيش طاووق وكباب لحم مع خضار مشوية.',
      price: 75, calories: 880, is_available: true,
      image_url: '/seed-images/kantami/products/mixed-grill.webp',
      tags: ['chef-pick'], allergens: ['gluten'], sort_order: 0
    },
    {
      id: 'p-7', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-3',
      name_en: 'Shish Taouk', name_ar: 'شيش طاووق',
      description_en: 'Grilled marinated chicken skewers with garlic dip.',
      description_ar: 'أسياخ دجاج متبل مشوية مع ثومية.',
      price: 45, calories: 520, is_available: true,
      image_url: '/seed-images/kantami/products/shish-taouk.webp',
      tags: ['chef-pick'], allergens: ['gluten'], sort_order: 1
    },
    {
      id: 'p-8', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-4',
      name_en: 'Fattoush', name_ar: 'فتوش',
      description_en: 'Mixed greens with toasted pita, sumac, and pomegranate molasses.',
      description_ar: 'خضار ورقية مع خبز محمص وسماق ودبس رمان.',
      price: 24, calories: 220, is_available: true,
      image_url: '/seed-images/kantami/products/fattoush.webp',
      tags: ['vegetarian'], allergens: ['sesame'], sort_order: 0
    },
    {
      id: 'p-9', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-5',
      name_en: 'Baklava', name_ar: 'بقلاوة',
      description_en: 'Layered filo pastry with pistachios and rose-water syrup.',
      description_ar: 'عجينة فيلو متعددة الطبقات بالفستق وشراب ماء الورد.',
      price: 28, calories: 410, is_available: true,
      image_url: '/seed-images/kantami/products/baklava.webp',
      tags: ['sweet'], allergens: ['gluten', 'nuts', 'dairy'], sort_order: 0
    },
    {
      id: 'p-10', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-5',
      name_en: 'Knafeh', name_ar: 'كنافة',
      description_en: 'Warm cheese pastry soaked in sweet syrup, topped with pistachio.',
      description_ar: 'حلوى جبن دافئة منقوعة بالقطر مزينة بالفستق.',
      price: 32, calories: 480, is_available: true,
      image_url: '/seed-images/kantami/products/knafeh.webp',
      tags: ['sweet'], allergens: ['gluten', 'nuts', 'dairy'], sort_order: 1
    },
    {
      id: 'p-11', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-6',
      name_en: 'Fresh Lemonade', name_ar: 'ليموناضة طازجة',
      description_en: 'House-made lemonade with mint.',
      description_ar: 'ليموناضة منزلية بالنعناع.',
      price: 14, calories: 120, is_available: true,
      image_url: '/seed-images/kantami/products/fresh-lemonade.webp',
      tags: ['refreshing'], allergens: [], sort_order: 0
    },
    {
      id: 'p-12', company_id: 'kantami', branch_id: 'branch-main', category_id: 'cat-6',
      name_en: 'Arabic Coffee', name_ar: 'قهوة عربية',
      description_en: 'Cardamom-spiced traditional Arabic coffee.',
      description_ar: 'قهوة عربية تقليدية بالهيل.',
      price: 12, calories: 10, is_available: true,
      image_url: '/seed-images/kantami/products/arabic-coffee.webp',
      tags: [], allergens: [], sort_order: 1
    }
  ],
  members: [
    { user_id: 'mock-owner', email: 'owner@kantami.com', role: 'owner', created_at: '2026-06-01T12:00:00Z' }
  ],
  invites: []
};

const LS_KEY = (slug) => `qrious:${slug}`;

function readMock(slug) {
  try {
    const raw = localStorage.getItem(LS_KEY(slug));
    if (raw) {
      const data = JSON.parse(raw);
      
      // Upgrade cached Kantami data to Phase 10 (fresh seed images)
      if (slug === 'kantami' && (!data.company.logo_url || !data.company.logo_url.startsWith('/seed-images/'))) {
        data.company.logo_url = '/seed-images/kantami/logo.webp';
        data.company.cover_url = '/seed-images/kantami/cover.webp';
        
        data.categories.forEach(cat => {
          if (cat.name_en === 'Mezze') cat.image_url = '/seed-images/kantami/categories/mezze.webp';
          if (cat.name_en === 'Shawarma') cat.image_url = '/seed-images/kantami/categories/shawarma.webp';
          if (cat.name_en === 'Grills') cat.image_url = '/seed-images/kantami/categories/grills.webp';
          if (cat.name_en === 'Salads') cat.image_url = '/seed-images/kantami/categories/salads.webp';
          if (cat.name_en === 'Desserts') cat.image_url = '/seed-images/kantami/categories/desserts.webp';
          if (cat.name_en === 'Beverages') cat.image_url = '/seed-images/kantami/categories/beverages.webp';
        });

        data.products.forEach(p => {
          if (p.name_en === 'Hummus') p.image_url = '/seed-images/kantami/products/hummus.webp';
          if (p.name_en === 'Tabbouleh') p.image_url = '/seed-images/kantami/products/tabbouleh.webp';
          if (p.name_en === 'Falafel') p.image_url = '/seed-images/kantami/products/falafel.webp';
          if (p.name_en === 'Chicken Shawarma') p.image_url = '/seed-images/kantami/products/chicken-shawarma.webp';
          if (p.name_en === 'Beef Shawarma') p.image_url = '/seed-images/kantami/products/beef-shawarma.webp';
          if (p.name_en === 'Mixed Grill') p.image_url = '/seed-images/kantami/products/mixed-grill.webp';
          if (p.name_en === 'Shish Taouk') p.image_url = '/seed-images/kantami/products/shish-taouk.webp';
          if (p.name_en === 'Fattoush') p.image_url = '/seed-images/kantami/products/fattoush.webp';
          if (p.name_en === 'Baklava') p.image_url = '/seed-images/kantami/products/baklava.webp';
          if (p.name_en === 'Knafeh') p.image_url = '/seed-images/kantami/products/knafeh.webp';
          if (p.name_en === 'Fresh Lemonade') p.image_url = '/seed-images/kantami/products/fresh-lemonade.webp';
          if (p.name_en === 'Arabic Coffee') p.image_url = '/seed-images/kantami/products/arabic-coffee.webp';
        });
      }

      // Upgrade cached Kantami data to Phase 2 (currency)
      if (slug === 'kantami' && !data.company.currency_code) {
        data.company.currency_code = 'USD';
        data.company.country_code = 'LB';
      }

      // Upgrade cached Kantami data to Phase 3
      if (slug === 'kantami' && (!data.company.secondary_color || !data.categories[0].image_url || (data.products[0] && data.products[0].tags === undefined))) {
        data.company.secondary_color = '#0E7C7B';
        data.company.text_color = '#14110F';
        data.company.background_color = '#FAF8F5';
        
        data.categories.forEach(cat => {
          if (cat.name_en === 'Mezze') cat.image_url = 'https://images.unsplash.com/photo-1571197119282-7c4e2b16b86a?w=200&h=200&fit=crop';
          if (cat.name_en === 'Shawarma') cat.image_url = 'https://images.unsplash.com/photo-1633321702518-7feccafb94d5?w=200&h=200&fit=crop';
          if (cat.name_en === 'Grills') cat.image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop';
          if (cat.name_en === 'Salads') cat.image_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
          if (cat.name_en === 'Desserts') cat.image_url = 'https://images.unsplash.com/photo-1605197788044-5b4dee76c40c?w=200&h=200&fit=crop';
          if (cat.name_en === 'Beverages') cat.image_url = 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=200&h=200&fit=crop';
        });

        data.products.forEach(p => {
          if (['Hummus','Tabbouleh','Falafel','Fattoush'].includes(p.name_en)) {
            p.tags = ['vegetarian'];
            p.allergens = ['sesame'];
          } else if (['Chicken Shawarma','Beef Shawarma'].includes(p.name_en)) {
            p.tags = ['spicy'];
            p.allergens = ['gluten','dairy'];
          } else if (['Mixed Grill','Shish Taouk'].includes(p.name_en)) {
            p.tags = ['chef-pick'];
            p.allergens = ['gluten'];
          } else if (['Baklava','Knafeh'].includes(p.name_en)) {
            p.tags = ['sweet'];
            p.allergens = ['gluten','nuts','dairy'];
          } else if (p.name_en === 'Fresh Lemonade') {
            p.tags = ['refreshing'];
            p.allergens = [];
          } else {
            p.tags = [];
            p.allergens = [];
          }
        });
      }

      // Upgrade cached Kantami data to Phase 5
      if (slug === 'kantami' && (!data.company.tags || !data.members)) {
        data.company.tags = KANTAMI_TAGS;
        data.members = [
          { user_id: 'mock-owner', email: 'owner@kantami.com', role: 'owner', created_at: '2026-06-01T12:00:00Z' }
        ];
        data.invites = [];

        // Force lowercase tags/allergens on products
        data.products.forEach(p => {
          if (p.tags) p.tags = p.tags.map(t => t.toLowerCase());
          if (p.allergens) p.allergens = p.allergens.map(a => a.toLowerCase());
        });
      }

      // Upgrade cached Kantami data to Phase 6 (branches)
      if (slug === 'kantami' && (!data.company.branches || (data.categories[0] && !data.categories[0].branch_id))) {
        data.company.branches = [
          {
            id: 'branch-main',
            slug: 'main',
            name_en: 'Main branch',
            name_ar: 'الفرع الرئيسي',
            is_default: true,
            is_active: true,
            address_en: 'Beirut, Lebanon',
            address_ar: 'بيروت، لبنان',
            phone: '+9611234567',
            whatsapp: '+9611234567',
            google_map: 'https://maps.google.com/?q=Beirut',
            cover_url: '',
            hours: {
              mon: { open: '09:00', close: '23:00', closed: false },
              tue: { open: '09:00', close: '23:00', closed: false },
              wed: { open: '09:00', close: '23:00', closed: false },
              thu: { open: '09:00', close: '23:00', closed: false },
              fri: { open: '09:00', close: '23:00', closed: false },
              sat: { open: '09:00', close: '23:00', closed: false },
              sun: { open: '09:00', close: '23:00', closed: false }
            }
          }
        ];
        data.categories.forEach(cat => {
          if (!cat.branch_id) cat.branch_id = 'branch-main';
          if (!cat.company_id) cat.company_id = 'kantami';
        });
        data.products.forEach(p => {
          if (!p.branch_id) p.branch_id = 'branch-main';
          if (!p.company_id) p.company_id = 'kantami';
        });
      }
      
      // Upgrade cached Kantami data to Phase 7b (products sort_order)
      if (slug === 'kantami' && data.products.some(p => p.sort_order === undefined)) {
        const catGroupCount = {};
        data.products.forEach(p => {
          const catId = p.category_id;
          if (catGroupCount[catId] === undefined) {
            catGroupCount[catId] = 0;
          }
          p.sort_order = catGroupCount[catId]++;
        });
      }
      
      localStorage.setItem(LS_KEY(slug), JSON.stringify(data));
      return data;
    }
  } catch (e) { /* ignore */ }
  
  if (slug === 'kantami') {
    localStorage.setItem(LS_KEY(slug), JSON.stringify(SEED));
    return SEED;
  }
  return null;
}

async function hasAdminAccess(companyId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: isSA } = await supabase.rpc('is_super_admin');
    if (isSA) return true;

    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!member;
  } catch (e) {
    return false;
  }
}

function hasAdminAccessMock(company) {
  try {
    const userStr = localStorage.getItem('qrious:currentUser');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user.email === 'admin@qrious.com') return true;
    
    const data = readMock(company.slug);
    if (!data) return false;
    const isMember = (data.members || []).some(m => m.email === user.email || m.user_id === user.id);
    return isMember;
  } catch (e) {
    return false;
  }
}

export async function loadCompanyBranches(slug) {
  if (isMockMode) {
    const data = readMock(slug);
    if (!data) return null;
    const status = data.company.status || 'active';
    if (status !== 'active') {
      const allowed = hasAdminAccessMock(data.company);
      if (!allowed) {
        return { error: 'RESTAURANT_INACTIVE', status };
      }
    }
    return { company: data.company, branches: data.company.branches || [] };
  }

  const { data: company } = await supabase
    .from('companies').select('*').eq('slug', slug).single();
  if (!company) return null;

  if (company.status && company.status !== 'active') {
    const allowed = await hasAdminAccess(company.id);
    if (!allowed) {
      return { error: 'RESTAURANT_INACTIVE', status: company.status };
    }
  }

  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('company_id', company.id)
    .order('sort_order');

  return { company, branches: branches || [] };
}

export async function loadMenu(slug, branchSlug) {
  if (isMockMode) {
    const data = readMock(slug);
    if (!data) return null;
    const status = data.company.status || 'active';
    if (status !== 'active') {
      const allowed = hasAdminAccessMock(data.company);
      if (!allowed) {
        return { error: 'RESTAURANT_INACTIVE', status };
      }
    }

    const branches = (data.company.branches || []).filter(b => b.is_active);
    const branch = branches.find(b => b.slug === branchSlug);
    if (!branch) return { company: data.company, branch: null, categories: [], products: [], branches };

    const categories = (data.categories || []).filter(c => c.branch_id === branch.id);
    const products = (data.products || []).filter(p => p.branch_id === branch.id);
    products.sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    return { company: data.company, branch, categories, products, branches };
  }

  const { data: company } = await supabase
    .from('companies').select('*').eq('slug', slug).single();
  if (!company) return null;

  if (company.status && company.status !== 'active') {
    const allowed = await hasAdminAccess(company.id);
    if (!allowed) {
      return { error: 'RESTAURANT_INACTIVE', status: company.status };
    }
  }

  const [branchesRes, categoriesRes, productsRes] = await Promise.all([
    supabase.from('branches').select('*').eq('company_id', company.id).eq('is_active', true).order('sort_order'),
    supabase.from('categories').select('*').eq('company_id', company.id).order('sort_order'),
    supabase.from('products').select('*').eq('company_id', company.id)
  ]);

  const branches = branchesRes.data || [];
  const branch = branches.find(b => b.slug === branchSlug);

  if (!branch) {
    return { company, branch: null, categories: [], products: [], branches };
  }

  const categories = (categoriesRes.data || []).filter(c => c.branch_id === branch.id);
  const products = (productsRes.data || []).filter(p => p.branch_id === branch.id);
  products.sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  return { company, branch, categories, products, branches };
}

export async function logVisit(companyId, branchId) {
  if (isMockMode) return;
  try {
    await supabase.from('visitor_logs').insert({ company_id: companyId, branch_id: branchId, visitor_hash: 'anon' });
  } catch (e) { /* ignore */ }
}

export async function logProductClick(companyId, productId, branchId) {
  if (isMockMode) return;
  try {
    await supabase.from('product_clicks').insert({ company_id: companyId, product_id: productId, branch_id: branchId });
  } catch (e) { /* ignore */ }
}

// Global master list fetches
export async function loadAllergens() {
  if (isMockMode) {
    return ALLERGENS;
  }
  const { data, error } = await supabase
    .from('allergens')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function loadTags(companyId) {
  if (isMockMode) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('qrious:')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data?.company && (data.company.id === companyId || data.company.slug === companyId)) {
            return data.company.tags || KANTAMI_TAGS;
          }
        } catch (e) { /* ignore */ }
      }
    }
    return KANTAMI_TAGS;
  }
  
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('company_id', companyId);
  if (error) throw error;
  return data;
}

// Add tag helper for tags table
export async function createTag(companyId, slug, nameEn, nameAr, color) {
  if (isMockMode) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('qrious:')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data?.company && (data.company.id === companyId || data.company.slug === companyId)) {
            if (!data.company.tags) data.company.tags = [];
            const newTag = { slug, name_en: nameEn, name_ar: nameAr, color };
            data.company.tags.push(newTag);
            localStorage.setItem(key, JSON.stringify(data));
            return newTag;
          }
        } catch (e) { /* ignore */ }
      }
    }
    return { slug, name_en: nameEn, name_ar: nameAr, color };
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({ company_id: companyId, slug, name_en: nameEn, name_ar: nameAr, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}
