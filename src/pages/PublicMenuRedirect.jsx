import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loadCompanyBranches, loadMenu } from '../services/dataService.js';
import PublicMenu from './PublicMenu.jsx';

const T = {
  en: {
    title: 'Select a Branch',
    titleAr: 'اختر فرعاً',
    closed: 'Closed',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    address: 'Address',
    hours: 'Hours',
    openNow: 'Open Now',
    noBranches: 'No active branches found.',
    noBranchesDesc: 'This restaurant does not have any active branch menus currently.',
    backToHome: 'Back to Home',
    loading: 'Loading menu...'
  },
  ar: {
    title: 'اختر فرعاً',
    titleAr: 'Select a Branch',
    closed: 'مغلق',
    phone: 'الهاتف',
    whatsapp: 'واتساب',
    address: 'العنوان',
    hours: 'ساعات العمل',
    openNow: 'مفتوح الآن',
    noBranches: 'لم يتم العثور على فروع نشطة.',
    noBranchesDesc: 'لا يحتوي هذا المطعم على أي قوائم فروع نشطة حالياً.',
    backToHome: 'العودة للرئيسية',
    loading: 'جاري تحميل القائمة...'
  }
};

const DAYS_MAP = {
  mon: { en: 'Monday', ar: 'الإثنين' },
  tue: { en: 'Tuesday', ar: 'الثلاثاء' },
  wed: { en: 'Wednesday', ar: 'الأربعاء' },
  thu: { en: 'Thursday', ar: 'الخميس' },
  fri: { en: 'Friday', ar: 'الجمعة' },
  sat: { en: 'Saturday', ar: 'السبت' },
  sun: { en: 'Sunday', ar: 'الأحد' }
};

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PublicMenuRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [company, setCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [preloadedData, setPreloadedData] = useState(null);
  const [isSingleBranch, setIsSingleBranch] = useState(false);

  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  const t = T[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await loadCompanyBranches(slug);
        if (cancelled) return;

        if (!result) {
          setErrorMsg(t.noBranchesDesc);
          setLoading(false);
          return;
        }

        const activeBranches = (result.branches || []).filter(b => b.is_active);
        setCompany(result.company);
        setBranches(activeBranches);

        if (activeBranches.length === 1) {
          // Exactly 1 branch: load menu data synchronously
          const menuData = await loadMenu(slug, activeBranches[0].slug);
          if (cancelled) return;
          setPreloadedData(menuData);
          setIsSingleBranch(true);
        } else if (activeBranches.length === 0) {
          setErrorMsg(t.noBranchesDesc);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMsg('Failed to load menu configuration.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, lang]);

  // Set brand colors on document root if company is loaded
  useEffect(() => {
    if (company) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', company.theme_color || '#C0392B');
      root.style.setProperty('--primary-soft', hexToRgba(company.theme_color || '#C0392B', 0.14));
      root.style.setProperty('--secondary-color', company.secondary_color || '#0E7C7B');
      root.style.setProperty('--text', company.text_color || '#14110F');
      root.style.setProperty('--bg', company.background_color || '#FAF8F5');
      
      document.body.dir = isRtl ? 'rtl' : 'ltr';
    }
  }, [company, isRtl]);

  const toggleLanguage = () => {
    setSearchParams({ lang: lang === 'en' ? 'ar' : 'en' });
  };

  // If it's a single branch, render PublicMenu in place
  if (isSingleBranch && preloadedData) {
    return (
      <PublicMenu 
        slug={slug} 
        branchSlug={branches[0].slug} 
        preloadedData={preloadedData} 
      />
    );
  }

  if (loading) {
    return <PublicMenu slug={slug} loading={true} />;
  }

  if (errorMsg || branches.length === 0) {
    return (
      <div className="picker-error-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="picker-error-card">
          <h2>{t.noBranches}</h2>
          <p>{errorMsg || t.noBranchesDesc}</p>
          <Link to="/" className="btn-primary-landing" style={{ marginTop: '20px', display: 'inline-block' }}>
            {t.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="picker-layout-container" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top Floating bar (language toggle) */}
      <header className="picker-top-bar" style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="picker-restaurant-header">
          {company.logo_url && <img src={company.logo_url} alt="" className="picker-logo" />}
          <span style={{ fontWeight: 700 }}>{isRtl ? company.name_ar : company.name_en}</span>
        </div>
        <button className="picker-lang-btn" onClick={toggleLanguage}>
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </header>

      {/* Hero Banner Area */}
      <div className="picker-cover-hero">
        {company.cover_url ? (
          <img src={company.cover_url} alt="" className="picker-cover-img" />
        ) : (
          <div className="picker-cover-fallback" style={{ backgroundColor: 'var(--primary-color)' }}></div>
        )}
        <div className="picker-hero-overlay"></div>
        <div className="picker-hero-title-box">
          <h1 style={{ color: '#ffffff' }}>{isRtl ? company.name_ar : company.name_en}</h1>
          <p style={{ color: '#ffffff', opacity: 0.9 }}>{isRtl ? company.description_ar : company.description_en}</p>
        </div>
      </div>

      {/* Main branch list */}
      <main className="picker-main">
        <h2 className="picker-section-title">{t.title}</h2>
        <div className="picker-branches-grid">
          {branches.map(branch => {
            const bName = isRtl ? branch.name_ar : branch.name_en;
            const bAddr = isRtl ? branch.address_ar : branch.address_en;

            return (
              <div 
                key={branch.id} 
                className="branch-picker-card" 
                onClick={() => navigate(`/menu/${slug}/${branch.slug}?lang=${lang}`)}
              >
                <div className="branch-card-image-box">
                  {branch.cover_url ? (
                    <img src={branch.cover_url} alt="" />
                  ) : (
                    <div className="branch-cover-fallback" style={{ backgroundColor: 'var(--primary-soft)' }}>
                      <span>📍</span>
                    </div>
                  )}
                </div>

                <div className="branch-card-content">
                  <div className="branch-card-header">
                    <h3>{bName}</h3>
                    <span className="branch-open-badge" style={{ color: 'var(--primary-color)', background: 'var(--primary-soft)' }}>
                      {t.openNow}
                    </span>
                  </div>

                  {bAddr && (
                    <p className="branch-info-row">
                      <strong>{t.address}:</strong> {bAddr}
                    </p>
                  )}

                  {(branch.phone || branch.whatsapp) && (
                    <p className="branch-info-row">
                      <strong>{t.phone}:</strong> {branch.phone || branch.whatsapp}
                    </p>
                  )}

                  {branch.hours && Object.keys(branch.hours).length > 0 && (
                    <div className="branch-hours-summary">
                      <strong>{t.hours}:</strong>
                      <div className="branch-hours-mini-list">
                        {Object.entries(branch.hours).slice(0, 3).map(([dayKey, dayVal]) => (
                          <div key={dayKey} className="hours-mini-item">
                            <span>{DAYS_MAP[dayKey]?.[lang] || dayKey}: </span>
                            <span>
                              {dayVal.closed ? t.closed : `${dayVal.open} - ${dayVal.close}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
