import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loadMenu, loadAllergens, loadTags } from '../services/dataService.js';
import { setDocumentMeta, resetDocumentMeta } from '../lib/setDocumentMeta.js';

const T = {
  en: {
    back: 'Back',
    share: 'Share',
    kcal: 'kcal',
    allergensHeader: 'Contains allergens',
    notFound: 'Product not found',
    notFoundDesc: 'We could not find the product you are looking for.',
    backToMenu: 'Back to Menu',
    copied: 'Link copied to clipboard!'
  },
  ar: {
    back: 'الرجوع',
    share: 'مشاركة',
    kcal: 'سعرة',
    allergensHeader: 'يحتوي على مواد مسببة للحساسية',
    notFound: 'المنتج غير موجود',
    notFoundDesc: 'لم نتمكن من العثور على المنتج المطلوبة.',
    backToMenu: 'الرجوع إلى القائمة',
    copied: 'تم نسخ الرابط إلى الحافظة!'
  }
};

function formatPrice(amount, currencyCode, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch (e) {
    return `${currencyCode} ${amount}`;
  }
}

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

export default function ProductDetail() {
  const { slug, branchSlug, productId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Master lists lookups
  const [allergensList, setAllergensList] = useState([]);
  const [tagsList, setTagsList] = useState([]);

  // Preserve language from URL search param
  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  const t = T[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadMenu(slug, branchSlug);
      if (cancelled) return;
      
      setData(result);
      if (result) {
        const prod = result.products.find(p => p.id === productId);
        setProduct(prod);

        // Fetch master lists for lookups
        const allAllergens = await loadAllergens();
        const allTags = await loadTags(result.company.id);
        if (!cancelled) {
          setAllergensList(allAllergens);
          setTagsList(allTags);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, branchSlug, productId]);

  // Apply colors to root HTML element
  useEffect(() => {
    if (data?.company) {
      const c = data.company;
      const root = document.documentElement;
      root.style.setProperty('--primary-color', c.theme_color || '#C0392B');
      root.style.setProperty('--primary-soft', hexToRgba(c.theme_color || '#C0392B', 0.14));
      root.style.setProperty('--secondary-color', c.secondary_color || '#0E7C7B');
      root.style.setProperty('--text', c.text_color || '#14110F');
      root.style.setProperty('--bg', c.background_color || '#FAF8F5');
      
      document.body.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    
    return () => {
      // Restore default variables on unmount
      const root = document.documentElement;
      root.style.setProperty('--primary-color', '#FF5722');
      root.style.setProperty('--primary-soft', 'rgba(255, 87, 34, 0.12)');
      root.style.setProperty('--secondary-color', '#0E7C7B');
      root.style.setProperty('--text', '#14110F');
      root.style.setProperty('--bg', '#FAF8F5');
    };
  }, [data, isRtl, lang]);

  // Per-tenant dynamic document meta
  useEffect(() => {
    if (!data?.company || !product) return;
    const c = data.company;
    const b = data.branch;
    const isRtl = lang === 'ar';
    
    const prodName = isRtl ? (product.name_ar || product.name_en) : product.name_en;
    const restName = isRtl ? (c.name_ar || c.name_en) : c.name_en;
    const title = `${prodName} | ${restName}${b ? ' — ' + (isRtl ? (b.name_ar || b.name_en) : b.name_en) : ''}`;
    const description = isRtl ? (product.description_ar || product.description_en || '') : (product.description_en || '');
    const imageUrl = product.image_url || c.logo_url || '';
    
    setDocumentMeta({
      title,
      description,
      themeColor: c.theme_color || '#FF5722',
      imageUrl,
      url: window.location.href
    });
    return () => resetDocumentMeta();
  }, [data?.company?.id, data?.branch?.id, product, lang]);



  const handleShare = async () => {
    const shareData = {
      title: product ? (isRtl ? product.name_ar : product.name_en) : 'QRious Menu',
      text: product ? (isRtl ? product.description_ar : product.description_en) : 'Check out this product!',
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast(t.copied);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleBack = () => {
    navigate(`/menu/${slug}/${branchSlug}?lang=${lang}`);
  };

  if (loading) {
    return (
      <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="empty">
          <h2>{isRtl ? 'جارٍ التحميل...' : 'Loading product...'}</h2>
        </div>
      </div>
    );
  }

  if (data && data.error === 'RESTAURANT_INACTIVE') {
    const status = data.status;
    return (
      <div className="app-shell" style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5', color: '#14110F', fontFamily: 'var(--font-en)', padding: '24px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: '40px', maxWidth: '440px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: status === 'suspended' ? '#DC2626' : '#EA580C', margin: '0 0 16px 0' }}>
            {status === 'pending' ? 'Menu Awaiting Approval' : 'Menu Offline'}
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            {status === 'pending'
              ? 'This menu is awaiting administrative approval and is currently offline. Please check back later.'
              : 'This menu is currently restricted or suspended by system administrators.'}
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="empty">
          <h2>{t.notFound}</h2>
          <p>{t.notFoundDesc}</p>
          <Link to={`/menu/${slug}/${branchSlug}?lang=${lang}`} className="btn-primary-landing" style={{ display: 'inline-block', marginTop: '20px' }}>
            {t.backToMenu}
          </Link>
        </div>
      </div>
    );
  }

  const c = data.company;
  const name = isRtl ? product.name_ar : product.name_en;
  const desc = isRtl ? product.description_ar : product.description_en;
  const tags = product.tags || [];
  const allergens = product.allergens || [];

  return (
    <div className="app-shell product-detail-shell" style={{ background: 'var(--bg)' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="detail-toast">
          {toastMessage}
        </div>
      )}

      {/* Hero Image Section */}
      <div className="detail-hero">
        {product.image_url ? (
          <img src={product.image_url} alt={name} className="detail-hero-img" />
        ) : (
          <div className="detail-hero-fallback" style={{ backgroundColor: 'var(--primary-color)' }}>
            <span className="fallback-letter">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Top-Bar Buttons */}
        <button className="detail-btn btn-back" onClick={handleBack} aria-label={t.back}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <button className="detail-btn btn-share" onClick={handleShare} aria-label={t.share}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* Body Block in Secondary Color */}
      <main className="detail-body" style={{ backgroundColor: 'var(--secondary-color)' }}>
        <h1 className="detail-name">{name}</h1>

        {/* Resolve tags from lookup map */}
        <div className="detail-row-badges">
          {tags.map(tslug => {
            const tag = tagsList.find(t => t.slug === tslug);
            if (!tag) return null;
            return (
              <span 
                key={tslug} 
                className="detail-badge tag-badge" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: `1.5px solid ${tag.color}`,
                  color: '#ffffff'
                }}
              >
                {isRtl ? tag.name_ar : tag.name_en}
              </span>
            );
          })}

          {product.calories ? (
            <span className="detail-badge cal-badge">
              {product.calories} {t.kcal}
            </span>
          ) : null}
        </div>

        {/* Resolve allergens from lookup map */}
        {allergens.length > 0 && (
          <div className="detail-allergens-box">
            <h3 className="allergens-title">{t.allergensHeader}</h3>
            <div className="allergens-chips-row">
              {allergens.map(aslug => {
                const allergen = allergensList.find(a => a.slug === aslug);
                if (!allergen) return null;
                return (
                  <span key={aslug} className="allergen-chip">
                    <span className="allergen-icon">{allergen.icon}</span>
                    {isRtl ? allergen.name_ar : allergen.name_en}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {desc && <p className="detail-description">{desc}</p>}

        {/* Price Chip */}
        <div className="detail-price-box">
          <div className="detail-price-chip">
            {formatPrice(product.price, c.currency_code || 'USD', isRtl ? 'ar-LB' : 'en-US')}
          </div>
        </div>
      </main>
    </div>
  );
}
