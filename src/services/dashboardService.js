import { supabase, isMockMode } from '../supabaseClient.js';

// Convert File to Data URL for Mock Mode image storage
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMockData(slug) {
  const raw = localStorage.getItem(`qrious:${slug}`);
  if (!raw) return null;
  const data = JSON.parse(raw);
  
  if (!data.categories) data.categories = [];
  if (!data.products) data.products = [];
  if (!data.visitor_logs) data.visitor_logs = [];
  if (!data.product_clicks) data.product_clicks = [];
  if (!data.company.branches) data.company.branches = [];
  
  return data;
}

function saveMockData(slug, data) {
  localStorage.setItem(`qrious:${slug}`, JSON.stringify(data));
}

function normalizeSocialLink(value, platform) {
  if (!value) return '';
  let trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.substring(1);
  }
  if (platform === 'instagram') return `https://instagram.com/${trimmed}`;
  if (platform === 'snapchat') return `https://snapchat.com/add/${trimmed}`;
  if (platform === 'twitter') return `https://x.com/${trimmed}`;
  return trimmed;
}

function normalizeProfileData(profileData) {
  const data = { ...profileData };
  if (data.phone) {
    data.phone = data.phone.replace(/[^\d+]/g, '');
  }
  if (data.whatsapp) {
    data.whatsapp = data.whatsapp.replace(/\D/g, '');
  }
  if (data.instagram) {
    data.instagram = normalizeSocialLink(data.instagram, 'instagram');
  }
  if (data.snapchat) {
    data.snapchat = normalizeSocialLink(data.snapchat, 'snapchat');
  }
  if (data.twitter) {
    data.twitter = normalizeSocialLink(data.twitter, 'twitter');
  }
  return data;
}

// 1. Company Profile functions
export async function getCompany(userId, slug) {
  if (isMockMode) {
    const data = getMockData(slug);
    return data ? data.company : null;
  }
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', userId)
    .single();
  if (error) {
    console.error('Error loading company profile:', error);
    return null;
  }
  return data;
}

export async function updateCompany(slug, profileData) {
  const normalized = normalizeProfileData(profileData);
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    
    // Preserve branches
    const prevBranches = data.company.branches;
    data.company = { ...data.company, ...normalized, branches: prevBranches };
    saveMockData(slug, data);
    return data.company;
  }
  const { data, error } = await supabase
    .from('companies')
    .update(normalized)
    .eq('slug', slug)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Image upload
export async function uploadImage(bucket, file, userId) {
  if (isMockMode) {
    return await fileToDataUrl(file);
  }
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;
  
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) {
    console.error(`Storage upload failed for bucket "${bucket}" with path "${filePath}":`, error);
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

// 2. Categories CRUD
export async function getCategories(companyId, slug, branchId) {
  if (!branchId) throw new Error('branchId is required for getCategories');

  if (isMockMode) {
    const data = getMockData(slug);
    return data ? [...data.categories].filter(c => c.branch_id === branchId).sort((a, b) => a.sort_order - b.sort_order) : [];
  }
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('branch_id', branchId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function addCategory(companyId, slug, nameEn, nameAr, sortOrder, imageUrl = null, branchId) {
  if (!branchId) throw new Error('branchId is required for addCategory');

  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    const newCat = {
      id: 'cat-' + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      branch_id: branchId,
      name_en: nameEn,
      name_ar: nameAr,
      sort_order: sortOrder,
      image_url: imageUrl
    };
    data.categories.push(newCat);
    saveMockData(slug, data);
    return newCat;
  }
  const { data, error } = await supabase
    .from('categories')
    .insert({
      company_id: companyId,
      branch_id: branchId,
      name_en: nameEn,
      name_ar: nameAr,
      sort_order: sortOrder,
      image_url: imageUrl
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(companyId, slug, id, nameEn, nameAr, imageUrl = undefined) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    const idx = data.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updated = { ...data.categories[idx], name_en: nameEn, name_ar: nameAr };
      if (imageUrl !== undefined) {
        updated.image_url = imageUrl;
      }
      data.categories[idx] = updated;
      saveMockData(slug, data);
      return data.categories[idx];
    }
    throw new Error('Category not found');
  }

  const updates = { name_en: nameEn, name_ar: nameAr };
  if (imageUrl !== undefined) {
    updates.image_url = imageUrl;
  }

  const { data: catData, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return catData;
}

export async function deleteCategory(companyId, slug, id) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    data.categories = data.categories.filter(c => c.id !== id);
    data.products = data.products.filter(p => p.category_id !== id);
    saveMockData(slug, data);
    return true;
  }
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function reorderCategories(companyId, slug, categoriesList) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    categoriesList.forEach(c => {
      const idx = data.categories.findIndex(orig => orig.id === c.id);
      if (idx !== -1) {
        data.categories[idx].sort_order = c.sort_order;
      }
    });
    saveMockData(slug, data);
    return true;
  }
  const promises = categoriesList.map(c => 
    supabase
      .from('categories')
      .update({ sort_order: c.sort_order })
      .eq('id', c.id)
  );
  await Promise.all(promises);
  return true;
}

// 3. Products CRUD
export async function getProducts(companyId, slug, branchId) {
  if (!branchId) throw new Error('branchId is required for getProducts');

  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) return [];
    const prods = [...data.products].filter(p => p.branch_id === branchId);
    prods.sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    return prods;
  }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('branch_id', branchId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function reorderProducts(companyId, slug, categoryId, orderedIds) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    orderedIds.forEach((id, idx) => {
      const p = data.products.find(x => x.id === id);
      if (p) p.sort_order = idx;
    });
    saveMockData(slug, data);
    return true;
  }
  await Promise.all(orderedIds.map((id, idx) =>
    supabase.from('products').update({ sort_order: idx }).eq('id', id)
  ));
  return true;
}

export async function addProduct(companyId, slug, productData) {
  if (!productData.branch_id) throw new Error('branch_id is required in productData for addProduct');

  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    const categoryProducts = data.products.filter(p => p.category_id === productData.category_id);
    const maxSortOrder = categoryProducts.length > 0 ? Math.max(...categoryProducts.map(p => p.sort_order ?? 0)) : 0;
    const newProd = {
      id: 'p-' + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      ...productData,
      sort_order: maxSortOrder + 1,
      tags: productData.tags || [],
      allergens: productData.allergens || []
    };
    data.products.push(newProd);
    saveMockData(slug, data);
    return newProd;
  }

  // Get max sort order in this category
  const { data: existing, error: sortError } = await supabase
    .from('products')
    .select('sort_order')
    .eq('category_id', productData.category_id)
    .order('sort_order', { ascending: false })
    .limit(1);
  
  let nextSortOrder = 1;
  if (!sortError && existing && existing.length > 0) {
    nextSortOrder = (existing[0].sort_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ company_id: companyId, ...productData, sort_order: nextSortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(companyId, slug, id, productData) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    const idx = data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.products[idx] = { 
        ...data.products[idx], 
        ...productData,
        tags: productData.tags || [],
        allergens: productData.allergens || []
      };
      saveMockData(slug, data);
      return data.products[idx];
    }
    throw new Error('Product not found');
  }
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(companyId, slug, id) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    data.products = data.products.filter(p => p.id !== id);
    saveMockData(slug, data);
    return true;
  }
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// 4. Branches CRUD Services
export async function getBranches(companyId, slug) {
  if (isMockMode) {
    const data = getMockData(slug);
    return data?.company?.branches || [];
  }
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function addBranch(companyId, slug, branchData) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    
    if (!data.company.branches) data.company.branches = [];
    
    const newId = 'branch-' + Math.random().toString(36).substring(2, 9);
    
    if (branchData.is_default) {
      data.company.branches.forEach(b => { b.is_default = false; });
    }
    
    const newBranch = {
      id: newId,
      company_id: companyId,
      ...branchData,
      created_at: new Date().toISOString()
    };
    
    data.company.branches.push(newBranch);
    saveMockData(slug, data);
    return newBranch;
  }

  if (branchData.is_default) {
    await supabase.from('branches').update({ is_default: false }).eq('company_id', companyId);
  }

  const { data, error } = await supabase
    .from('branches')
    .insert({ company_id: companyId, ...branchData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBranch(companyId, slug, id, branchData) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    
    const idx = data.company.branches.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Branch not found');
    
    if (branchData.is_default) {
      data.company.branches.forEach(b => { b.is_default = false; });
    }
    
    data.company.branches[idx] = {
      ...data.company.branches[idx],
      ...branchData
    };
    saveMockData(slug, data);
    return data.company.branches[idx];
  }

  if (branchData.is_default) {
    await supabase.from('branches').update({ is_default: false }).eq('company_id', companyId);
  }

  const { data, error } = await supabase
    .from('branches')
    .update(branchData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBranch(companyId, slug, id) {
  if (isMockMode) {
    const data = getMockData(slug);
    if (!data) throw new Error('Company not found');
    
    const count = data.company.branches.length;
    if (count <= 1) throw new Error('You must have at least one branch.');
    
    data.company.branches = data.company.branches.filter(b => b.id !== id);
    
    // Cascade delete categories and products for this branch in mock storage
    data.categories = data.categories.filter(c => c.branch_id !== id);
    data.products = data.products.filter(p => p.branch_id !== id);
    
    saveMockData(slug, data);
    return true;
  }

  const { data: countData, error: countErr } = await supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
    
  if (countErr) throw countErr;
  if (countData && countData.length <= 1) {
    throw new Error('You must have at least one branch.');
  }

  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// 5. Analytics Services
export async function getAnalytics(companyId, slug, branchId = 'all', range = '7') {
  const days = range === '30' ? 30 : 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  const cutoffStr = cutoff.toISOString().split('T')[0] + 'T00:00:00Z';

  if (isMockMode) {
    const data = getMockData(slug);
    let visitorLogs = data ? data.visitor_logs : [];
    let productClicks = data ? data.product_clicks : [];
    const products = data ? data.products : [];

    // Filter by date cutoff
    visitorLogs = visitorLogs.filter(log => log.created_at && log.created_at >= cutoffStr);
    productClicks = productClicks.filter(click => click.created_at && click.created_at >= cutoffStr);

    if (branchId && branchId !== 'all') {
      visitorLogs = visitorLogs.filter(log => log.branch_id === branchId);
      productClicks = productClicks.filter(click => click.branch_id === branchId);
    }

    return processAnalyticsData(visitorLogs, productClicks, products, days);
  }

  let visitorsQuery = supabase.from('visitor_logs').select('created_at').eq('company_id', companyId).gte('created_at', cutoffStr);
  let clicksQuery = supabase.from('product_clicks').select('product_id, created_at').eq('company_id', companyId).gte('created_at', cutoffStr);
  let productsQuery = supabase.from('products').select('id, name_en, name_ar, image_url').eq('company_id', companyId);

  if (branchId && branchId !== 'all') {
    visitorsQuery = visitorsQuery.eq('branch_id', branchId);
    clicksQuery = clicksQuery.eq('branch_id', branchId);
  }

  const { data: visitorLogs } = await visitorsQuery;
  const { data: productClicks } = await clicksQuery;
  const { data: products } = await productsQuery;

  return processAnalyticsData(visitorLogs || [], productClicks || [], products || [], days);
}

function processAnalyticsData(visitorLogs, productClicks, products, days) {
  const now = new Date();
  const formatDateKey = (d) => d.toISOString().split('T')[0];

  const visitorsByDay = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    visitorsByDay[formatDateKey(d)] = 0;
  }

  visitorLogs.forEach(log => {
    if (!log.created_at) return;
    const dateKey = log.created_at.split('T')[0];
    if (visitorsByDay[dateKey] !== undefined) {
      visitorsByDay[dateKey]++;
    }
  });

  const dailyVisitors = Object.entries(visitorsByDay).map(([date, count]) => ({
    date,
    count
  }));

  const clickCounts = {};
  productClicks.forEach(click => {
    clickCounts[click.product_id] = (clickCounts[click.product_id] || 0) + 1;
  });

  const topProducts = Object.entries(clickCounts)
    .map(([productId, count]) => {
      const prod = products.find(p => p.id === productId);
      return {
        id: productId,
        name_en: prod ? prod.name_en : 'Unknown Product',
        name_ar: prod ? prod.name_ar : 'منتج غير معروف',
        image_url: prod ? prod.image_url : null,
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    dailyVisitors,
    topProducts
  };
}
