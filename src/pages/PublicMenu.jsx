import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loadMenu, logProductClick, logVisit } from '../services/dataService.js';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { setDocumentMeta, resetDocumentMeta } from '../lib/setDocumentMeta.js';

const T = {
  en: { 
    kcal: 'kcal', 
    loading: 'Loading menu…', 
    notFound: 'Menu not found', 
    notFoundDesc: 'We could not load this restaurant.',
    copied: 'Link copied',
    backToMenu: 'Back to Menu'
  },
  ar: { 
    kcal: 'سعرة', 
    loading: 'جارٍ تحميل القائمة…', 
    notFound: 'القائمة غير موجودة', 
    notFoundDesc: 'لم نتمكن من تحميل هذا المطعم.',
    copied: 'تم نسخ الرابط',
    backToMenu: 'العودة للقائمة'
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

function getSocialUrl(value, platform) {
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

export function PublicMenuSkeleton() {
  return (
    <div className="app-shell skeleton-wrapper">
      <div className="skeleton-cover"></div>
      <header className="header">
        <div className="logo skeleton-logo"></div>
        <div className="skeleton-text-bar brand-name"></div>
        <div className="skeleton-text-bar brand-desc"></div>
        <div className="social-inline skeleton-social-row">
          <div className="skeleton-social-btn"></div>
          <div className="skeleton-social-btn"></div>
          <div className="skeleton-social-btn"></div>
          <div className="skeleton-social-btn"></div>
        </div>
      </header>
      <div className="menu-search-sticky-container">
        <div className="cat-bar skeleton-cat-bar">
          <div className="cat-scroll">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="cat-tile skeleton-cat-tile">
                <div className="cat-tile-avatar skeleton-cat-avatar"></div>
                <div className="skeleton-text-bar skeleton-cat-name"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <main style={{ padding: '0 16px', marginTop: '20px' }}>
        <div className="skeleton-section-title"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="product skeleton-product-card">
            <div className="product-img skeleton-product-img"></div>
            <div className="product-body skeleton-product-body">
              <div className="skeleton-text-bar product-name" style={{ width: '40%' }}></div>
              <div className="skeleton-text-bar product-desc" style={{ width: '80%' }}></div>
              <div className="skeleton-product-meta">
                <div className="skeleton-text-bar product-price" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

export default function PublicMenu({ slug: propSlug, branchSlug: propBranchSlug, preloadedData, isCustomerSpace, eligibleCouponCategories = null }) {
  const params = useParams();
  const slug = propSlug || params.slug;
  const branchSlug = propBranchSlug || params.branchSlug;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { canInstall, prompt: installPrompt } = useInstallPrompt();
  const [data, setData] = useState(preloadedData || null);
  const [loading, setLoading] = useState(!preloadedData);
  const [toastMessage, setToastMessage] = useState('');
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  
  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const setLang = (newLang) => {
    setSearchParams({ lang: newLang });
  };
  
  const [activeCat, setActiveCat] = useState(null);
  const sectionRefs = useRef({});
  const chipRefs = useRef({});
  const catScrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isRtl = lang === 'ar';
  const t = T[lang];

  // Drag to scroll variables
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragMovedRef = useRef(0);

  // Per-tenant manifest injection
  useEffect(() => {
    if (!data?.company || !data?.branch) return;
    const c = data.company;
    const b = data.branch;
    const manifest = {
      name: `${c.name_en} — ${b.name_en}`,
      short_name: c.name_en.slice(0, 12),
      start_url: window.location.pathname,
      scope: `/menu/${c.slug}/`,
      display: 'standalone',
      background_color: c.background_color || '#FAF8F5',
      theme_color: c.theme_color || '#FF5722',
      orientation: 'portrait',
      icons: [
        { src: c.logo_url || '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: c.logo_url || '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    const link = document.getElementById('app-manifest');
    const prev = link?.getAttribute('href');
    link?.setAttribute('href', url);
    return () => {
      if (prev) link?.setAttribute('href', prev);
      URL.revokeObjectURL(url);
    };
  }, [data?.company?.id, data?.branch?.id]);

  // Per-tenant dynamic document meta
  useEffect(() => {
    if (!data?.company) return;
    const c = data.company;
    const b = data.branch;
    const isRtl = lang === 'ar';
    const title = `${isRtl ? (c.name_ar || c.name_en) : c.name_en}${b ? ' — ' + (isRtl ? (b.name_ar || b.name_en) : b.name_en) : ''}`;
    const description = isRtl ? (c.description_ar || c.description_en || '') : (c.description_en || '');
    const imageUrl = c.cover_url || c.logo_url || '';
    setDocumentMeta({
      title,
      description,
      themeColor: c.theme_color || '#FF5722',
      imageUrl,
      url: window.location.href
    });
    return () => resetDocumentMeta();
  }, [data?.company?.id, data?.branch?.id, lang]);

  useEffect(() => {
    document.body.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [isRtl, lang]);

  // Load menu data if not preloaded
  useEffect(() => {
    if (preloadedData) {
      setData(preloadedData);
      setLoading(false);
      // Log visit
      if (preloadedData.company?.id && preloadedData.branch?.id) {
        logVisit(preloadedData.company.id, preloadedData.branch.id);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadMenu(slug, branchSlug);
      if (cancelled) return;
      setData(result);
      setLoading(false);
      if (result?.company?.id && result?.branch?.id) {
        logVisit(result.company.id, result.branch.id);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, branchSlug, preloadedData]);

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
    }
    
    return () => {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', '#FF5722');
      root.style.setProperty('--primary-soft', 'rgba(255, 87, 34, 0.12)');
      root.style.setProperty('--secondary-color', '#0E7C7B');
      root.style.setProperty('--text', '#14110F');
      root.style.setProperty('--bg', '#FAF8F5');
    };
  }, [data]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const cats = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);
    return cats.map(cat => ({
      cat,
      items: data.products.filter(p => p.category_id === cat.id)
    })).filter(g => g.items.length > 0);
  }, [data]);

  useEffect(() => {
    if (grouped.length && !activeCat) setActiveCat(grouped[0].cat.id);
  }, [grouped, activeCat]);

  // Position-based scroll spy tracker
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!grouped.length) return;

    function pickActive() {
      if (isScrollingRef.current) return; // suppress during programmatic scroll from chip tap
      const bar = document.querySelector('.cat-bar');
      const stickyOffset = (bar?.getBoundingClientRect().bottom ?? 120) + 8;

      // Pick the last section whose top edge has crossed the sticky bar's bottom.
      // If none has crossed yet (user is above the first section), keep the first.
      let candidateId = grouped[0].cat.id;
      for (const { cat } of grouped) {
        const el = sectionRefs.current[cat.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - stickyOffset <= 0) candidateId = cat.id;
        else break;
      }

      // Bottom-of-page override: if the page is scrolled to (near) the bottom,
      // force the last section active, since its top may still be above the sticky bar
      // but nothing else is coming.
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (nearBottom) candidateId = grouped[grouped.length - 1].cat.id;

      setActiveCat(prev => {
        if (prev === candidateId) return prev;
        const chipEl = chipRefs.current[candidateId];
        if (chipEl) {
          chipEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
        return candidateId;
      });
    }

    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        pickActive();
        tickingRef.current = false;
      });
    }

    pickActive(); // initial
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [grouped]);

  function scrollToCat(catId) {
    isScrollingRef.current = true;
    setActiveCat(catId);

    const chipEl = chipRefs.current[catId];
    if (chipEl) {
      chipEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const el = sectionRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: 'smooth' });
    }

    // Release observer lock after scroll finishes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  }

  const handleProductClick = (cId, pId) => {
    logProductClick(cId, pId, data?.branch?.id);
    navigate(`/menu/${slug}/${branchSlug}/product/${pId}?lang=${lang}`);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const shareMenu = async () => {
    const url = window.location.href.split('?')[0];
    const title = c ? `${c.name_en} — Menu` : 'QRious Menu';
    const text = c ? `Check out ${c.name_en}'s menu` : 'Check out our menu!';
    if (navigator.share) {
      try { 
        await navigator.share({ title, text, url }); 
      } catch (e) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast(t.copied);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  // Desktop drag-to-scroll handlers
  const handleMouseDown = (e) => {
    const el = catScrollRef.current;
    if (!el) return;
    draggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    dragMovedRef.current = 0;
    el.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;
    const el = catScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current);
    el.scrollLeft = scrollLeftRef.current - walk;
    dragMovedRef.current += Math.abs(walk);
  };

  const handleMouseUpOrLeave = () => {
    draggingRef.current = false;
    const el = catScrollRef.current;
    if (el) {
      el.style.cursor = 'grab';
    }
  };

  const handleChipClick = (e, catId) => {
    if (dragMovedRef.current > 4) {
      e.preventDefault();
      return;
    }
    scrollToCat(catId);
  };

  if (loading) {
    return <PublicMenuSkeleton />;
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

  if (!data || !data.branch) {
    return (
      <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="empty">
          <h2>{t.notFound}</h2>
          <p>{t.notFoundDesc}</p>
        </div>
      </div>
    );
  }

  const c = data.company;
  const name = isRtl ? c.name_ar : c.name_en;
  const desc = isRtl ? c.description_ar : c.description_en;

  return (
    <div className="app-shell" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {toastMessage && (
        <div className="detail-toast">
          {toastMessage}
        </div>
      )}

      {!isCustomerSpace && (
        <div className="cover">
          {c.cover_url && (
            <img 
              src={c.cover_url} 
              alt="" 
              loading="eager" 
              fetchpriority="high"
            />
          )}

          {/* Cover Branch Switcher (Only if 2+ branches) */}
          {data.branches && data.branches.length >= 2 && (
            <div className="cover-branch-switcher">
              <button className="cover-branch-switcher-btn" onClick={() => setShowBranchSelect(!showBranchSelect)}>
                📍 {isRtl ? data.branch?.name_ar : data.branch?.name_en} ▾
              </button>
              {showBranchSelect && (
                <div className="cover-branch-dropdown">
                  {data.branches.map(b => (
                    <button 
                      key={b.id} 
                      className={`cover-branch-option ${b.id === data.branch?.id ? 'active' : ''}`}
                      onClick={() => {
                        setShowBranchSelect(false);
                        navigate(`/menu/${slug}/${b.slug}?lang=${lang}`);
                      }}
                    >
                      {isRtl ? b.name_ar : b.name_en}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="lang-switch">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'ar' ? 'active' : ''} onClick={() => setLang('ar')}>ع</button>
          </div>

          {/* Circular Share Button */}
          <button 
            className="cover-share-btn" 
            onClick={shareMenu} 
            aria-label={lang === 'ar' ? 'مشاركة' : 'Share'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>

          {/* PWA Install Button */}
          {canInstall && (
            <button 
              className="cover-install-btn" 
              onClick={installPrompt} 
              aria-label={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
                <polyline points="9 10 12 13 15 10" />
                <line x1="12" y1="6" x2="12" y2="13" />
              </svg>
            </button>
          )}
        </div>
      )}

      {!isCustomerSpace && (
        <header className="header">
          <div className="logo">
            {c.logo_url ? <img src={c.logo_url} alt={name} /> : null}
          </div>
          <h1 className="brand-name">{name}</h1>
          {data.branches && data.branches.length >= 2 && data.branch && (
            <div className="branch-header-pill" style={{ color: 'var(--primary-color)', background: 'var(--primary-soft)' }}>
              📍 {isRtl ? data.branch.name_ar : data.branch.name_en}
            </div>
          )}
          {desc && <p className="brand-desc">{desc}</p>}
          
          {/* Inline Social Buttons row in header */}
          <SocialInline company={c} name={name} />
        </header>
      )}

      {/* Sticky Categories Bar */}
      <div className="menu-search-sticky-container">
        <nav className="cat-bar">
          <div 
            className="cat-scroll" 
            ref={catScrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{ scrollBehavior: 'smooth', cursor: 'grab' }}
          >
            {grouped.map(({ cat }) => (
              <button
                key={cat.id}
                ref={el => (chipRefs.current[cat.id] = el)}
                className={`cat-tile ${activeCat === cat.id ? 'active' : ''}`}
                onClick={(e) => handleChipClick(e, cat.id)}
              >
                <div className="cat-tile-avatar">
                  {cat.image_url ? <img src={cat.image_url} alt={isRtl ? cat.name_ar : cat.name_en} draggable="false" /> : null}
                </div>
                <span className="cat-tile-name">{isRtl ? cat.name_ar : cat.name_en}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <main>
        {grouped.map(({ cat, items }) => (
          <section
            key={cat.id}
            className="section"
            data-cat-id={cat.id}
            ref={el => (sectionRefs.current[cat.id] = el)}
          >
            <h2 className="section-title">{isRtl ? cat.name_ar : cat.name_en}</h2>
            {items.map(p => (
              <article
                key={p.id}
                className={`product ${!p.is_available ? 'unavailable' : ''}`}
                onClick={() => handleProductClick(c.id, p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProductClick(c.id, p.id);
                  }
                }}
              >
                <div className="product-img" style={{ position: 'relative' }}>
                  {p.image_url && <img src={p.image_url} alt="" loading="lazy" />}
                  {eligibleCouponCategories?.has(p.coupon_category) && (
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: isRtl ? 'auto' : '6px',
                      left: isRtl ? '6px' : 'auto',
                      backgroundColor: 'var(--primary-color)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      zIndex: 2,
                      whiteSpace: 'nowrap'
                    }}>
                      {isRtl ? (
                        p.coupon_category === 'main_course' ? 'BOGO · طبق رئيسي' :
                        p.coupon_category === 'dessert' ? 'BOGO · حلوى' : 'BOGO · مشروب'
                      ) : (
                        p.coupon_category === 'main_course' ? 'BOGO · Main' :
                        p.coupon_category === 'dessert' ? 'BOGO · Dessert' : 'BOGO · Beverage'
                      )}
                    </div>
                  )}
                </div>
                <div className="product-body">
                  <div>
                    <h3 className="product-name">{isRtl ? p.name_ar : p.name_en}</h3>
                    <p className="product-desc">{isRtl ? p.description_ar : p.description_en}</p>
                  </div>
                  <div className="product-meta">
                    <span className="product-price">{formatPrice(p.price, c.currency_code || 'USD', isRtl ? 'ar-LB' : 'en-US')}</span>
                    {p.calories ? <span className="product-cal">{p.calories} {t.kcal}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

function SocialInline({ company, name }) {
  const buttons = [
    company.whatsapp && {
      href: `https://wa.me/${company.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + name)}`,
      label: `WhatsApp ${company.whatsapp}`,
      icon: <WhatsAppIcon />,
      isExternal: true
    },
    company.phone && {
      href: `tel:${company.phone.replace(/[^\d+]/g, '')}`,
      label: `Call ${company.phone}`,
      icon: <PhoneIcon />,
      isExternal: false
    },
    company.google_map && {
      href: company.google_map.startsWith('http') ? company.google_map : `https://maps.google.com/?q=${encodeURIComponent(company.google_map)}`,
      label: 'Google Maps Location',
      icon: <MapIcon />,
      isExternal: true
    },
    company.instagram && {
      href: getSocialUrl(company.instagram, 'instagram'),
      label: `Instagram ${company.instagram}`,
      icon: <InstagramIcon />,
      isExternal: true
    },
    company.snapchat && {
      href: getSocialUrl(company.snapchat, 'snapchat'),
      label: `Snapchat ${company.snapchat}`,
      icon: <SnapchatIcon />,
      isExternal: true
    },
    company.twitter && {
      href: getSocialUrl(company.twitter, 'twitter'),
      label: `Twitter ${company.twitter}`,
      icon: <TwitterIcon />,
      isExternal: true
    }
  ].filter(Boolean);

  if (!buttons.length) return null;

  return (
    <div className="social-inline">
      {buttons.map(b => (
        <a 
          key={b.label} 
          className="social-btn" 
          href={b.href} 
          target={b.isExternal ? '_blank' : undefined} 
          rel={b.isExternal ? 'noopener noreferrer' : undefined} 
          aria-label={b.label}
        >
          {b.icon}
        </a>
      ))}
    </div>
  );
}

const ICON_SIZE = 20;

function WhatsAppIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>);
}
function PhoneIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>);
}
function MapIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
}
function InstagramIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>);
}
function SnapchatIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c3 0 5 2 5 5v4c1 1 3 2 3 3 0 1-2 1-3 2-1 2-2 4-5 4s-4-2-5-4c-1-1-3-1-3-2 0-1 2-2 3-3V7c0-3 2-5 5-5z"/></svg>);
}
function TwitterIcon() {
  return (<svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>);
}
