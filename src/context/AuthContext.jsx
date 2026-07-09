import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase, isMockMode } from '../supabaseClient.js';
import { KANTAMI_TAGS } from '../services/dataService.js';
import { isMockSuperAdmin, seedMockAdmins } from '../services/adminService.js';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

// Simple fallback UUID generator
function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : 'uu-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
}

// Local mock-mode demo credentials. Not used against Supabase.
// If you're running mock mode locally, use these to sign in:
//   email:    demo@qriousqr.local
//   password: demo1234
const DEFAULT_MOCK_USER = {
  email: 'demo@qriousqr.local',
  password: 'demo1234',
  company_slug: 'kantami',
  user_id: 'mock-owner'
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [memberships, setMemberships] = useState([]);
  const [currentCompanyId, setCurrentCompanyId] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);

  const checkCustomerStatus = async (usr) => {
    if (!usr) {
      setIsCustomer(false);
      return false;
    }
    if (isMockMode) {
      try {
        const mockCusts = JSON.parse(localStorage.getItem('qriousqr:mock_customer_users') || '[]');
        const isCust = mockCusts.some(c => c.email.toLowerCase() === usr.email.toLowerCase());
        setIsCustomer(isCust);
        return isCust;
      } catch {
        setIsCustomer(false);
        return false;
      }
    } else {
      try {
        const { data, error } = await supabase.rpc('customer_me');
        const isCust = !error && Array.isArray(data) && data.length > 0;
        setIsCustomer(isCust);
        return isCust;
      } catch {
        setIsCustomer(false);
        return false;
      }
    }
  };

  const checkSuperAdminStatus = async (usr) => {
    if (!usr) {
      setIsSuperAdmin(false);
      return false;
    }
    if (isMockMode) {
      const isSA = isMockSuperAdmin(usr.email);
      setIsSuperAdmin(isSA);
      return isSA;
    } else {
      try {
        const { data, error } = await supabase.rpc('is_super_admin');
        if (error) throw error;
        const isSA = !!data;
        setIsSuperAdmin(isSA);
        return isSA;
      } catch (err) {
        console.error('Error checking super admin status:', err);
        setIsSuperAdmin(false);
        return false;
      }
    }
  };

  // Initialize Auth
  useEffect(() => {
    if (isMockMode) {
      seedMockAdmins();
      // Setup default mock users if not present
      try {
        const storedUsers = localStorage.getItem('qrious:mock_users');
        if (!storedUsers) {
          localStorage.setItem('qrious:mock_users', JSON.stringify([DEFAULT_MOCK_USER]));
        }
      } catch (e) {
        console.error(e);
      }

      // Check for saved mock session
      try {
        const storedSession = localStorage.getItem('qrious:session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          setSession(parsed);
          setUser(parsed.user);
          if (parsed.user) {
            checkSuperAdminStatus(parsed.user);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    } else {
      // Live Supabase Auth setup
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkSuperAdminStatus(session.user);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkSuperAdminStatus(session.user);
        } else {
          setIsSuperAdmin(false);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Load memberships when user is loaded
  const refreshMemberships = async () => {
    if (!user) {
      setMemberships([]);
      setCurrentCompanyId('');
      return;
    }
    
    if (isMockMode) {
      const list = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('qrious:')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data?.company) {
              const isOwner = data.company.owner_id === user.id;
              const member = data.members?.find(m => m.user_id === user.id);
              if (isOwner || member) {
                list.push({
                  id: data.company.id,
                  slug: data.company.slug,
                  name_en: data.company.name_en,
                  name_ar: data.company.name_ar,
                  role: isOwner ? 'owner' : (member?.role || 'staff'),
                  status: data.company.status || 'active',
                  status_reason: data.company.status_reason || ''
                });
              }
            }
          } catch (e) { /* ignore */ }
        }
      }
      setMemberships(list);
      if (list.length > 0) {
        const owned = list.find(m => m.role === 'owner');
        setCurrentCompanyId(owned ? owned.id : list[0].id);
      }
    } else {
      const { data: memberRows, error } = await supabase
        .from('company_members')
        .select('role, company_id, company:companies(id, slug, name_en, name_ar, status, status_reason)')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error loading company memberships:', error);
        return;
      }

      const list = (memberRows || []).map(r => ({
        id: r.company?.id,
        slug: r.company?.slug,
        name_en: r.company?.name_en,
        name_ar: r.company?.name_ar,
        role: r.role,
        status: r.company?.status || 'active',
        status_reason: r.company?.status_reason || ''
      })).filter(item => item.id);

      setMemberships(list);
      if (list.length > 0) {
        const owned = list.find(m => m.role === 'owner');
        setCurrentCompanyId(owned ? owned.id : list[0].id);
      }
    }
  };

  useEffect(() => {
    refreshMemberships();
    checkSuperAdminStatus(user);
    checkCustomerStatus(user);
  }, [user]);

  const currentCompany = useMemo(() => {
    return memberships.find(m => m.id === currentCompanyId) || null;
  }, [memberships, currentCompanyId]);

  const activeRole = useMemo(() => {
    return currentCompany ? currentCompany.role : 'staff';
  }, [currentCompany]);

  // Sign In function
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      if (isMockMode) {
        seedMockAdmins();
        const isSA = isMockSuperAdmin(email);
        
        let found = null;
        if (isSA) {
          const users = JSON.parse(localStorage.getItem('qrious:mock_users') || '[]');
          found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (!found) {
            found = {
              email: email.toLowerCase(),
              password: 'demo1234',
              company_slug: '',
              user_id: generateUUID()
            };
            users.push(found);
            localStorage.setItem('qrious:mock_users', JSON.stringify(users));
          }
          if (password !== found.password) {
            throw new Error('Invalid email or password');
          }
        } else {
          const users = JSON.parse(localStorage.getItem('qrious:mock_users') || '[]');
          found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
          if (!found) {
            throw new Error('Invalid email or password');
          }
        }
        
        const mockSession = {
          user: { id: found.user_id, email: found.email, company_slug: found.company_slug },
          company_slug: found.company_slug
        };
        localStorage.setItem('qrious:session', JSON.stringify(mockSession));
        setSession(mockSession);
        setUser(mockSession.user);
        
        setIsSuperAdmin(isSA);
        const redirectTo = isSA ? '/admin' : '/dashboard';
        return { data: { user: mockSession.user }, error: null, redirectTo };
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        const { data: isSA } = await supabase.rpc('is_super_admin');
        if (isSA) {
          setIsSuperAdmin(true);
          return { data, error: null, redirectTo: '/admin' };
        }
        
        setIsSuperAdmin(false);

        // Load the user's memberships. Pick the first (or their owned) company.
        const { data: rows } = await supabase.from('company_members')
          .select('company_id, role, company:companies(id, status)')
          .eq('user_id', data.user.id);

        const owned = (rows || []).find(r => r.role === 'owner');
        const target = owned || (rows || [])[0];
        if (!target) return { data, error: null, redirectTo: '/auth' };
        const status = target.company?.status;
        if (status === 'pending' || status === 'restricted') {
          return { data, error: null, redirectTo: '/pending-approval' };
        }
        if (status === 'suspended') {
          return { data, error: null, redirectTo: '/suspended' };
        }
        return { data, error: null, redirectTo: '/dashboard' };
      }
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Up function
  const signUp = async ({ email, password, restNameEn, restNameAr, slug, country, currency, inviteToken = null }) => {
    setLoading(true);
    try {
      if (isMockMode) {
        const users = JSON.parse(localStorage.getItem('qrious:mock_users') || '[]');
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          throw new Error('Email is already registered');
        }

        if (!inviteToken && slug) {
          const slugExists = users.some(u => u.company_slug.toLowerCase() === slug.toLowerCase()) || 
                             localStorage.getItem(`qrious:${slug}`) !== null;
          if (slugExists && slug !== 'kantami') {
            throw new Error('Restaurant slug is already taken');
          }
        }

        const userId = generateUUID();
        const newUser = {
          email,
          password,
          company_slug: slug || '',
          user_id: userId
        };
        users.push(newUser);
        localStorage.setItem('qrious:mock_users', JSON.stringify(users));

        const mockSession = {
          user: { id: userId, email, company_slug: slug || '' },
          company_slug: slug || ''
        };
        localStorage.setItem('qrious:session', JSON.stringify(mockSession));
        setSession(mockSession);
        setUser(mockSession.user);

        // If NOT joining via invite, create a new company
        if (!inviteToken && slug) {
          const companyId = generateUUID();
          const categoryId = generateUUID();
          const productId = generateUUID();

          const newCompanyData = {
            company: {
              id: companyId,
              slug,
              name_en: restNameEn,
              name_ar: restNameAr,
              description_en: 'Welcome to our restaurant.',
              description_ar: 'مرحباً بكم في مطعمنا.',
              logo_url: '',
              cover_url: '',
              theme_color: '#FF5722',
              secondary_color: '#0E7C7B',
              text_color: '#14110F',
              background_color: '#FAF8F5',
              country_code: country,
              currency_code: currency,
              owner_id: userId,
              whatsapp: '', phone: '', google_map: '', instagram: '', snapchat: '', twitter: '',
              tags: KANTAMI_TAGS
            },
            categories: [
              { id: categoryId, company_id: companyId, name_en: 'Menu', name_ar: 'القائمة', sort_order: 1 }
            ],
            products: [
              {
                id: productId,
                company_id: companyId,
                category_id: categoryId,
                name_en: 'Starter Dish',
                name_ar: 'طبق مقبلات',
                description_en: 'Welcome to our restaurant! This is a sample dish.',
                description_ar: 'مرحباً بكم في مطعمنا! هذا طبق عينة.',
                price: 10.00,
                is_available: true,
                calories: 150,
                image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
                tags: [], allergens: []
              }
            ],
            members: [
              { id: 'member-owner', company_id: companyId, user_id: userId, email, role: 'owner', created_at: new Date().toISOString() }
            ],
            invites: []
          };

          localStorage.setItem(`qrious:${slug}`, JSON.stringify(newCompanyData));
          newUser.company_slug = slug;
          mockSession.company_slug = slug;
          mockSession.user.company_slug = slug;
          localStorage.setItem('qrious:session', JSON.stringify(mockSession));
          localStorage.setItem('qrious:mock_users', JSON.stringify(users));
        }

        return { data: { user: mockSession.user }, error: null };
      } else {
        // Client-generated throwaway password. The user replaces it via the verification-email flow.
        const throwaway = crypto.randomUUID() + '-' + crypto.randomUUID();

        const { data, error } = await supabase.auth.signUp({
          email,
          password: throwaway,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/set-password`
          }
        });
        if (error) throw error;
        if (!data.user) throw new Error('Sign up failed');

        if (!inviteToken && slug) {
          const { error: rpcErr } = await supabase.rpc('register_tenant', {
            p_email: email,
            p_slug: slug,
            p_name_en: restNameEn,
            p_name_ar: restNameAr,
            p_country_code: country,
            p_currency_code: currency,
          });
          if (rpcErr) {
            // Surface friendly errors based on the RPC error message
            const msg = rpcErr.message || '';
            if (msg.includes('slug_taken')) throw new Error('That restaurant slug is already taken.');
            if (msg.includes('user_has_tenant')) throw new Error('This account already owns a restaurant.');
            if (msg.includes('auth_user_not_found')) throw new Error('Sign-up did not complete. Try again.');
            throw rpcErr;
          }
        }

        return { data, error: null };
      }
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign Out function
  const signOut = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        localStorage.removeItem('qrious:session');
        localStorage.removeItem('qriousqr:mock_customer_session');
        setSession(null);
        setUser(null);
        setIsCustomer(false);
        return { error: null };
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { error: null };
      }
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    loading,
    memberships,
    currentCompanyId,
    setCurrentCompanyId,
    currentCompany,
    activeRole,
    refreshMemberships,
    isSuperAdmin,
    checkSuperAdminStatus,
    isCustomer,
    checkCustomerStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
