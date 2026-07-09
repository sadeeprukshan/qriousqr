import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

const FLAGS = {
  LB: '🇱🇧', AE: '🇦🇪', SA: '🇸🇦', QA: '🇶🇦', BH: '🇧🇭', OM: '🇴🇲', KW: '🇰🇼',
  EG: '🇪🇬', JO: '🇯🇴', SY: '🇸🇾', IQ: '🇮🇶', YE: '🇾🇪', PS: '🇵🇸', SD: '🇸🇩',
  MA: '🇲🇦', DZ: '🇩🇿', TN: '🇹🇳', LY: '🇱🇾', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷',
  DE: '🇩🇪', IT: '🇮🇹', ES: '🇪🇸', TR: '🇹🇷', IR: '🇮🇷', CA: '🇨🇦'
};

const T = {
  en: {
    welcome: 'Welcome, {name}.',
    pinSubline: 'Your 9-digit PIN is {pin}. Say this to the waiter when you claim a coupon.',
    copyPin: 'Copy PIN',
    copied: 'Copied!',
    signOut: 'Sign Out',
    title: 'Participating Restaurants',
    empty: 'No restaurants are participating yet.',
    loading: 'Loading directory...',
    changeLang: 'العربية'
  },
  ar: {
    welcome: 'أهلاً بك، {name}.',
    pinSubline: 'رمز PIN الخاص بك المكون من 9 أرقام هو {pin}. أخبر النادل به عند استخدام قسيمة الخصم.',
    copyPin: 'نسخ الرمز',
    copied: 'تم النسخ!',
    signOut: 'تسجيل الخروج',
    title: 'المطاعم المشاركة',
    empty: 'لا توجد مطاعم مشاركة بعد.',
    loading: 'جاري تحميل الدليل...',
    changeLang: 'English'
  }
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [lang, setLang] = useState('en');
  const [customer, setCustomer] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [couponCounts, setCouponCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = T[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (isMockMode) {
          // Load mock customer
          const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
          if (session?.user) {
            setCustomer(session.user);
          }

          // Scan all localStorage keys starting with qrious: to fetch mock companies
          const list = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('qrious:') && key !== 'qrious:session' && key !== 'qrious:mock_users') {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data?.company) {
                  list.push({
                    id: data.company.id,
                    slug: data.company.slug,
                    name_en: data.company.name_en,
                    name_ar: data.company.name_ar,
                    logo_url: data.company.logo_url,
                    cover_url: data.company.cover_url,
                    country_code: data.company.country_code || 'LB'
                  });
                }
              } catch (e) {
                // ignore
              }
            }
          }

          // Fallback if no companies are created
          if (list.length === 0) {
            list.push({
              id: 'kantami-id',
              slug: 'kantami',
              name_en: 'Kantami',
              name_ar: 'كانتامي',
              logo_url: '',
              cover_url: '',
              country_code: 'LB'
            });
          }

          setRestaurants(list);

          // Mock Coupons Counts
          const email = session?.user?.email || 'diner@qriousqr.local';
          const mockCoupons = JSON.parse(localStorage.getItem('qriousqr:mock_coupons') || '[]');
          
          const counts = {};
          mockCoupons.forEach(c => {
            if (c.customer_email === email && c.status === 'available' && c.year === new Date().getFullYear()) {
              counts[c.company_slug] = (counts[c.company_slug] || 0) + 1;
            }
          });
          setCouponCounts(counts);
        } else {
          // Live Supabase
          const { data: me, error: meErr } = await supabase.rpc('customer_me');
          if (!meErr && me) {
            setCustomer(me);
          }

          const { data: list, error: listErr } = await supabase.rpc('customer_list_restaurants');
          if (!listErr && list) {
            setRestaurants(list);
          }

          // Fetch all current-year available coupons in one shot:
          const { data: allCoupons } = await supabase
            .from('coupons')
            .select('company_id, status, year')
            .eq('status', 'available')
            .eq('year', new Date().getFullYear());

          if (allCoupons) {
            const counts = {};
            allCoupons.forEach(c => {
              counts[c.company_id] = (counts[c.company_id] || 0) + 1;
            });
            setCouponCounts(counts);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopyPin = async () => {
    if (!customer?.user_pin) return;
    try {
      await navigator.clipboard.writeText(customer.user_pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer/login');
  };

  const welcomeText = t.welcome.replace('{name}', customer?.first_name || '');
  const rawPin = customer?.user_pin || '';
  const formattedPin = rawPin.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const pinText = t.pinSubline.replace('{pin}', formattedPin);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F5',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      direction: isRtl ? 'rtl' : 'ltr',
      paddingBottom: '40px'
    }}>
      {/* Top Banner Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
        padding: '24px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.01)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text)' }}>
              {welcomeText}
            </h1>
            {customer?.user_pin && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginTop: '6px'
              }}>
                <span style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                  {pinText}
                </span>
                <button
                  onClick={handleCopyPin}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: copied ? '#DCFCE7' : '#F3F4F6',
                    color: copied ? 'var(--primary-color)' : 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  {copied ? t.copied : t.copyPin}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {t.changeLang}
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '32px auto 0 auto',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: 'var(--text)',
          marginBottom: '20px',
          textAlign: isRtl ? 'right' : 'left'
        }}>
          {t.title}
        </h2>

        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                height: '240px',
                animation: 'pulse 1.5s infinite ease-in-out'
              }} />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            color: 'var(--text-soft)'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 17v-4h6v4M9 8h.01M15 8h.01" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              {t.empty}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {restaurants.map(rest => {
              const flag = FLAGS[rest.country_code] || '🌐';
              // Fallback image urls
              const coverUrl = rest.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';
              const logoUrl = rest.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';
              const count = couponCounts[rest.id] || couponCounts[rest.slug] || 0;

              return (
                <Link
                  key={rest.id}
                  to={`/customer/menu/${rest.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="restaurant-card" style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    {/* Cover Photo */}
                    <div style={{
                      width: '100%',
                      paddingTop: '62.5%', // 16:10 aspect ratio
                      backgroundImage: `url(${coverUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative'
                    }}>
                      {/* Green Offers Badge Overlay */}
                      {count > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#22C55E',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 2
                        }}>
                          {lang === 'ar' ? `${count} عروض` : `${count} offers`}
                        </div>
                      )}
                      
                      {/* Black Overlay gradient */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)'
                      }} />
                    </div>

                    {/* Logo & Content row */}
                    <div style={{
                      padding: '16px',
                      position: 'relative',
                      minHeight: '80px',
                      boxSizing: 'border-box'
                    }}>
                      {/* Logo Container (Overlapping) */}
                      <div style={{
                        position: 'absolute',
                        top: '-32px',
                        left: isRtl ? 'auto' : '16px',
                        right: isRtl ? '16px' : 'auto',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '3px solid #FFFFFF',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={logoUrl}
                          alt={`${rest.name_en} Logo`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Header block shifted beside the logo */}
                      <div style={{
                        paddingLeft: isRtl ? 0 : '68px',
                        paddingRight: isRtl ? '68px' : 0,
                        marginTop: '-4px',
                        textAlign: isRtl ? 'right' : 'left'
                      }}>
                        <h3 style={{
                          fontSize: '15px',
                          fontWeight: '800',
                          margin: '0 0 2px 0',
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: isRtl ? 'flex-start' : 'flex-start'
                        }}>
                          <span>{isRtl ? (rest.name_ar || rest.name_en) : rest.name_en}</span>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{flag}</span>
                        </h3>
                        {isRtl ? (
                          rest.name_en && rest.name_ar && (
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                              {rest.name_en}
                            </p>
                          )
                        ) : (
                          rest.name_ar && (
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-soft)', fontFamily: 'var(--font-ar)' }}>
                              {rest.name_ar}
                            </p>
                          )
                        )}
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--primary-color)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {rest.country_code}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        .restaurant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.04) !important;
        }
      `}} />
    </div>
  );
}
