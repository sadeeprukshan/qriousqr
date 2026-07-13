import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient.js';
import { translateCategory } from '../lib/couponCategories.js';

const T = {
  en: {
    title: 'My Coupons',
    subTitle: "You've used {count} coupons across {companyCount} restaurants.",
    emptyTitle: 'No coupons redeemed yet.',
    emptySub: 'Open a restaurant from Home and start earning your BOGO offers.',
    browseRestaurants: 'Browse Restaurants',
    redeemedOn: 'Redeemed on {date}',
    loading: 'Loading your coupon history...',
    bogoSuffix: '· BOGO'
  },
  ar: {
    title: 'قسائمي',
    subTitle: 'لقد استخدمت {count} قسائم في {companyCount} مطاعم.',
    emptyTitle: 'لم يتم استرداد أي قسائم بعد.',
    emptySub: 'افتح مطعماً من الصفحة الرئيسية وابدأ في كسب عروض BOGO الخاصة بك.',
    browseRestaurants: 'تصفح المطاعم',
    redeemedOn: 'تم الاسترداد في {date}',
    loading: 'جاري تحميل سجل القسائم الخاص بك...',
    bogoSuffix: '· BOGO'
  }
};

export default function CustomerClaims() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const t = T[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    async function loadClaims() {
      try {
        if (isMockMode) {
          const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
          const email = session?.user?.email || 'diner@qriousqr.local';

          const allMockClaims = JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
          // Filter to completed/authorized claims for this customer
          const customerClaims = allMockClaims
            .filter(c => c.customer_email === email && c.status === 'authorized')
            .map(c => ({
              claim_id: c.id,
              completed_at: c.authorized_at || c.created_at,
              category: c.category,
              year: 2026,
              company_id: c.company_id,
              company_name: c.company_slug === 'kantami' ? 'Kantami' : c.company_slug,
              company_slug: c.company_slug,
              company_logo_url: '',
              company_primary_color: '#FF5722'
            }));
          setClaims(customerClaims);
        } else {
          const { data, error } = await supabase.rpc('customer_my_claims');
          if (!error && data) {
            setClaims(data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, []);

  const totalUsed = claims.length;
  const uniqueCompaniesCount = new Set(claims.map(c => c.company_slug)).size;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>{t.loading}</h3>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px 16px 40px 16px',
      boxSizing: 'border-box',
      direction: isRtl ? 'rtl' : 'ltr',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      textAlign: isRtl ? 'right' : 'left'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
        {t.title}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-soft)', margin: '0 0 32px 0' }}>
        {t.subTitle.replace('{count}', totalUsed).replace('{companyCount}', uniqueCompaniesCount)}
      </p>

      {claims.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          border: '2px dashed var(--border)',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎟️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
            {t.emptyTitle}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 24px 0', lineHeight: '1.6' }}>
            {t.emptySub}
          </p>
          <button
            onClick={() => navigate(`/customer?lang=${lang}`)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-color, #FF5722)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {t.browseRestaurants}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {claims.map((claim) => {
            const logo = claim.company_logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';
            const catLabel = translateCategory(claim.category, lang);
            const dateStr = new Date(claim.completed_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={claim.claim_id}
                onClick={() => navigate(`/customer/restaurant/${claim.company_slug}?lang=${lang}`)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${claim.company_primary_color || 'var(--primary-color, #FF5722)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Restaurant Logo */}
                  <img
                    src={logo}
                    alt=""
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
                      {lang === 'ar' && claim.company_name_ar ? claim.company_name_ar : claim.company_name}
                    </h4>
                    <div style={{ fontSize: '13px', color: 'var(--text-soft)', fontWeight: '600' }}>
                      {catLabel} {t.bogoSuffix}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '4px' }}>
                      {t.redeemedOn.replace('{date}', dateStr)}
                    </div>
                  </div>
                </div>

                <div style={{
                  color: 'var(--text-soft)',
                  fontSize: '18px',
                  fontWeight: '800',
                  transform: isRtl ? 'rotate(180deg)' : 'none'
                }}>
                  →
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
