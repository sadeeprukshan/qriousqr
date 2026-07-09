import { supabase, isMockMode } from '../supabaseClient.js';

const MOCK_ADMINS_KEY = 'qrious:mock_super_admins';

export function isMockSuperAdmin(email) {
  try {
    const list = JSON.parse(localStorage.getItem(MOCK_ADMINS_KEY) || '[]');
    return list.map(e => e.toLowerCase()).includes((email || '').toLowerCase());
  } catch { return false; }
}

// Seed default mock admins for local demo. Called from AuthContext once.
export function seedMockAdmins() {
  try {
    const existing = localStorage.getItem(MOCK_ADMINS_KEY);
    if (!existing) {
      localStorage.setItem(MOCK_ADMINS_KEY, JSON.stringify(['admin@qrious.com','sadeeprukshan7@gmail.com']));
    }
  } catch {}
}

export async function adminListCompanies() {
  if (isMockMode) {
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('qrious:') || key === MOCK_ADMINS_KEY || key === 'qrious:mock_users' || key === 'qrious:session') continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (!data?.company) continue;
        const c = data.company;
        rows.push({
          id: c.id, slug: c.slug, name_en: c.name_en, name_ar: c.name_ar,
          country_code: c.country_code, currency_code: c.currency_code,
          status: c.status || 'active', status_reason: c.status_reason || null,
          status_changed_at: c.status_changed_at || null,
          owner_id: c.owner_id, owner_email: null,
          created_at: c.created_at || new Date().toISOString(),
          branch_count: (c.branches || []).length,
          category_count: (data.categories || []).length,
          product_count: (data.products || []).length,
          logo_url: c.logo_url || ''
        });
      } catch (e) { /* ignore */ }
    }
    return rows;
  }
  const { data, error } = await supabase.rpc('admin_list_companies');
  if (error) throw error;
  return data || [];
}

export async function adminChangeCompanyStatus(cid, newStatus, reason) {
  if (isMockMode) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('qrious:')) continue;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (data?.company?.id === cid) {
        data.company.status = newStatus;
        data.company.status_reason = reason || null;
        data.company.status_changed_at = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(data));
        return;
      }
    }
    throw new Error('Company not found');
  }
  const { error } = await supabase.rpc('admin_change_company_status', {
    cid, new_status: newStatus, reason: reason || null
  });
  if (error) throw error;
}

export async function adminResetOwnerPassword(email) {
  if (isMockMode) {
    console.log('[mock] password reset triggered for', email);
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth?mode=reset`
  });
  if (error) throw error;
}

export async function adminListUsers() {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return data || [];
}

export async function adminToggleSuperAdmin(userId, makeSuper) {
  if (isMockMode) return;
  const { error } = await supabase.rpc('admin_toggle_super_admin', { target_user_id: userId, make_super: makeSuper });
  if (error) throw new Error(error.message);
}

export async function adminDeleteUser(userId) {
  if (isMockMode) return;
  const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function adminDashboardStats() {
  if (isMockMode) {
    return {
      total_users: 2,
      super_admins: 1,
      total_tenants: 1,
      pending: 0,
      active: 1,
      restricted: 0,
      suspended: 0,
      total_products: 12,
      total_categories: 6,
      visits_30d: 0,
      clicks_30d: 0
    };
  }
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  if (error) throw error;
  return data?.[0] || null;
}

export async function adminSignupsByDay(days = 30) {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('admin_signups_by_day', { days });
  if (error) throw error;
  return data || [];
}

export async function adminTopMenus(topN = 10) {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('admin_top_menus', { top_n: topN });
  if (error) throw error;
  return data || [];
}

export async function adminTopProducts(topN = 10) {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('admin_top_products', { top_n: topN });
  if (error) throw error;
  return data || [];
}

// Security tradeoff notice: exposing an "email exists" oracle enables account enumeration.
// This is acceptable for QriousQR's stakes.
export async function emailExists(email) {
  if (isMockMode) {
    try {
      const users = JSON.parse(localStorage.getItem('qrious:mock_users') || '[]');
      const isUser = users.some(u => u.email?.toLowerCase() === email.toLowerCase());
      if (isUser) return true;
      
      const admins = JSON.parse(localStorage.getItem('qrious:mock_super_admins') || '[]');
      const isAdmin = admins.some(e => e.toLowerCase() === email.toLowerCase());
      return isAdmin;
    } catch { 
      return false; 
    }
  }
  const { data, error } = await supabase.rpc('email_exists', { p_email: email });
  if (error) return null;
  return Boolean(data);
}

export async function adminListCustomers(search = '', limit = 200) {
  if (isMockMode) {
    try {
      const rows = JSON.parse(localStorage.getItem('qriousqr:mock_customers') || '[]');
      const s = search.trim().toLowerCase();
      return s
        ? rows.filter(r =>
            r.email.toLowerCase().includes(s) ||
            (r.phone_code + r.phone).includes(search.replace(/[^\d+]/g, '')) ||
            `${r.first_name} ${r.last_name}`.toLowerCase().includes(s))
        : rows;
    } catch { return []; }
  }
  const { data, error } = await supabase.rpc('admin_list_customers', { p_search: search || null, p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function adminDeleteCustomer(id) {
  if (isMockMode) {
    const rows = JSON.parse(localStorage.getItem('qriousqr:mock_customers') || '[]');
    const next = rows.filter(r => r.id !== id);
    localStorage.setItem('qriousqr:mock_customers', JSON.stringify(next));
    return;
  }
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}
