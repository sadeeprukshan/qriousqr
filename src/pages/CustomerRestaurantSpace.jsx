import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PublicMenu from './PublicMenu.jsx';
import { claimStep1, cancelMyClaim } from '../services/couponService.js';

const T = {
  en: {
    back: 'Back to Directory',
    tabMenu: 'Menu',
    tabOffers: 'Offers',
    remainingCoupons: 'You have {count}/3 coupons remaining at this restaurant this year.',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
    beverage: 'Beverage',
    bogo: 'Buy one, get one free',
    available: 'Available',
    used: 'Used',
    expired: 'Expired',
    usedAt: 'Used on {date}',
    claim: 'Claim discount',
    validUntil: 'Valid until Dec 31, {year}',
    close: 'Close',
    cancel: 'Cancel',
    loading: 'Loading restaurant space...',
    
    // Claim Modal
    claimTitle: 'Redeem Coupon',
    enterMerchantPin: 'Enter Restaurant PIN',
    merchantPinSub: 'Ask the waiter for the restaurant\'s 6-digit PIN to initiate redemption.',
    wrongMerchantPin: 'That PIN doesn\'t match. Please try again.',
    wrongCustomerPin: 'Incorrect PIN. Ask the waiter to check the entered number.',
    claimExpired: 'This claim request has expired. Please try again.',
    tooManyAttempts: 'Claim rejected. The waiter entered the wrong PIN 3 times.',
    waitingAuth: 'Show this code to the waiter',
    waitingAuthSub: 'Waiting for staff to authorize on the console...',
    expiresIn: 'Expires in {time}',
    redeemedTitle: 'Coupon Redeemed 🎉',
    enjoyMeal: 'Enjoy your meal! The coupon was successfully validated.',
    claimFailed: 'Claim failed. Please try again.',
    submit: 'Confirm',
    
    // Your PIN Chip
    yourPin: 'Your PIN',
    yourPinTitle: 'Your QriousQR PIN',
    yourPinSub: 'Give this 9-digit PIN to the waiter to authorize your claim.'
  },
  ar: {
    back: 'العودة إلى الدليل',
    tabMenu: 'القائمة',
    tabOffers: 'العروض',
    remainingCoupons: 'لديك {count}/٣ قسائم متبقية في هذا المطعم هذا العام.',
    mainCourse: 'طبق رئيسي',
    dessert: 'حلوى',
    beverage: 'مشروب',
    bogo: 'اشتري واحداً واحصل على الآخر مجاناً',
    available: 'متاح',
    used: 'مستخدم',
    expired: 'منتهي الصلاحية',
    usedAt: 'استخدمت في {date}',
    claim: 'مطالبة بالخصم',
    validUntil: 'صالح حتى ٣١ ديسمبر، {year}',
    close: 'إغلاق',
    cancel: 'إلغاء',
    loading: 'جاري تحميل صفحة المطعم...',
    
    // Claim Modal
    claimTitle: 'استرداد القسيمة',
    enterMerchantPin: 'أدخل رمز المطعم',
    merchantPinSub: 'اطلب من النادل الرمز المكون من ٦ أرقام لبدء عملية الاسترداد.',
    wrongMerchantPin: 'الرمز غير صحيح. يرجى المحاولة مرة أخرى.',
    wrongCustomerPin: 'الرمز غير صحيح. اطلب من النادل التحقق من المدخلات.',
    claimExpired: 'انتهت صلاحية طلب الاسترداد هذا. يرجى المحاولة مرة أخرى.',
    tooManyAttempts: 'تم رفض الطلب. أدخل النادل الرمز الخاطئ ٣ مرات.',
    waitingAuth: 'أظهر هذا الرمز للنادل',
    waitingAuthSub: 'بانتظار موافقة موظف المطعم من وحدة التحكم...',
    expiresIn: 'ينتهي خلال {time}',
    redeemedTitle: 'تم استخدام القسيمة 🎉',
    enjoyMeal: 'بالهناء والشفاء! تم التحقق من القسيمة بنجاح.',
    claimFailed: 'فشلت عملية الاسترداد. يرجى المحاولة مرة أخرى.',
    submit: 'تأكيد',
    
    // Your PIN Chip
    yourPin: 'رمزك',
    yourPinTitle: 'رمز QriousQR الخاص بك',
    yourPinSub: 'أعط هذا الرمز المكون من ٩ أرقام للنادل للموافقة على طلب الاسترداد.'
  }
};

function ForkKnifeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z" />
      <path d="M19 17v5" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16h16" />
      <path d="M12 11V3" />
      <path d="M12 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3Z" />
      <path d="M2 21h20" />
    </svg>
  );
}

function WineGlassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22h8" />
      <path d="M12 11v11" />
      <path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2Z" />
    </svg>
  );
}

export default function CustomerRestaurantSpace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [lang, setLang] = useState(searchParams.get('lang') === 'ar' ? 'ar' : 'en');
  const [tab, setTab] = useState(searchParams.get('tab') === 'offers' ? 'offers' : 'menu');
  const [company, setCompany] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // PIN states
  const [customerPin, setCustomerPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Claim Modal States
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [claimState, setClaimState] = useState(''); // 'merchant_pin' | 'waiting' | 'success' | 'rejected' | 'expired'
  const [merchantPinInput, setMerchantPinInput] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimId, setClaimId] = useState('');
  const [claimExpiresAt, setClaimExpiresAt] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [countdownText, setCountdownText] = useState('03:00');
  const [shake, setShake] = useState(false);

  const t = T[lang];
  const isRtl = lang === 'ar';
  
   const countdownIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const eligibleCategories = useMemo(
    () => new Set(coupons.filter(c => c.status === 'available').map(c => c.category)),
    [coupons]
  );

  // Sync tab & lang selections to query parameters
  useEffect(() => {
    setSearchParams({ tab, lang });
  }, [tab, lang, setSearchParams]);

  // Load Restaurant Info
  const loadRestaurant = async () => {
    try {
      if (isMockMode) {
        const key = `qrious:${slug}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (data?.company) {
            setCompany(data.company);
          }
        } else {
          setCompany({
            id: 'kantami-id',
            slug: 'kantami',
            name_en: 'Kantami',
            name_ar: 'كانتامي',
            cover_url: '',
            logo_url: '',
            theme_color: '#FF5722',
            secondary_color: '#0E7C7B',
            text_color: '#14110F',
            background_color: '#FAF8F5'
          });
        }
      } else {
        const { data, error } = await supabase
          .from('companies')
          .select('id, slug, name_en, name_ar, logo_url, cover_url, theme_color, secondary_color, text_color, background_color')
          .eq('slug', slug)
          .single();
        if (!error && data) {
          setCompany(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  // Load Customer PIN
  useEffect(() => {
    async function loadPin() {
      if (isMockMode) {
        const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
        setCustomerPin(session?.user?.user_pin || '234567000');
      } else {
        // customer_me returns a TABLE, so data is an array
        const { data, error } = await supabase.rpc('customer_me');
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row?.user_pin) {
          setCustomerPin(row.user_pin);
        }
      }
    }
    loadPin();
  }, []);

  // Load Coupons
  const loadCoupons = async () => {
    try {
      if (isMockMode) {
        const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
        const email = session?.user?.email || 'diner@qriousqr.local';

        let allCoupons = JSON.parse(localStorage.getItem('qriousqr:mock_coupons') || '[]');
        let customerCoupons = allCoupons.filter(c => c.customer_email === email && c.company_slug === slug);
        
        if (customerCoupons.length === 0) {
          const newCoupons = [
            { id: 'mc-1', customer_email: email, company_slug: slug, category: 'main_course', status: 'available', used_at: null, year: 2026 },
            { id: 'mc-2', customer_email: email, company_slug: slug, category: 'dessert', status: 'available', used_at: null, year: 2026 },
            { id: 'mc-3', customer_email: email, company_slug: slug, category: 'beverage', status: 'available', used_at: null, year: 2026 }
          ];
          allCoupons = [...allCoupons, ...newCoupons];
          localStorage.setItem('qriousqr:mock_coupons', JSON.stringify(allCoupons));
          customerCoupons = newCoupons;
        }
        setCoupons(customerCoupons);
      } else {
        const { data, error } = await supabase.rpc('get_or_provision_coupons', { p_company_slug: slug });
        if (!error && data) {
          setCoupons(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [slug]);

  // Inject brand colors
  useEffect(() => {
    if (company) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', company.theme_color || '#FF5722');
      root.style.setProperty('--secondary-color', company.secondary_color || '#0E7C7B');
      root.style.setProperty('--text', company.text_color || '#14110F');
      root.style.setProperty('--bg', company.background_color || '#FAF8F5');
    }
    return () => {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', '#FF5722');
      root.style.setProperty('--secondary-color', '#0E7C7B');
      root.style.setProperty('--text', '#14110F');
      root.style.setProperty('--bg', '#FAF8F5');
    };
  }, [company]);

  // Realtime claims Postgres changes subscription & poll fallback
  useEffect(() => {
    if (claimState !== 'waiting' || !claimId) return;

    let active = true;

    // Realtime channel
    const ch = supabase
      .channel(`claim:${claimId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'coupon_claims', filter: `id=eq.${claimId}` },
        (payload) => {
          if (!active) return;
          const status = payload.new.status;
          if (status === 'authorized') setClaimState('success');
          else if (status === 'rejected') setClaimState('rejected');
          else if (status === 'expired') setClaimState('expired');
        })
      .subscribe();

    // Poll Fallback (10 seconds)
    const pollFallback = async () => {
      if (isMockMode) {
        // Mock Mode poll from localStorage qriousqr:mock_claims
        try {
          const claims = JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
          const c = claims.find(x => x.id === claimId);
          if (c) {
            if (c.status === 'authorized') setClaimState('success');
            else if (c.status === 'rejected') setClaimState('rejected');
            else if (c.status === 'expired') setClaimState('expired');
            else if (c.status === 'cancelled') setClaimState('merchant_pin');
          }
        } catch {}
      } else {
        try {
          const { data } = await supabase
            .from('coupon_claims')
            .select('status')
            .eq('id', claimId)
            .single();
          if (data && active) {
            if (data.status === 'authorized') setClaimState('success');
            else if (data.status === 'rejected') setClaimState('rejected');
            else if (data.status === 'expired') setClaimState('expired');
          }
        } catch {}
      }
    };

    pollIntervalRef.current = setInterval(pollFallback, 10000);

    // Also listen to storage events to immediately capture mock claims updates in real time
    const handleStorageChange = () => {
      pollFallback();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      active = false;
      supabase.removeChannel(ch);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [claimState, claimId]);

  // Countdown timer logic
  useEffect(() => {
    if (claimState !== 'waiting' || !claimExpiresAt) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    const updateTimer = () => {
      const ms = new Date(claimExpiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setCountdownText('00:00');
        setClaimState('expired');
        clearInterval(countdownIntervalRef.current);
        return;
      }
      const totalSecs = Math.floor(ms / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setCountdownText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    countdownIntervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [claimState, claimExpiresAt]);

  const handleStartClaim = (coupon) => {
    setSelectedCoupon(coupon);
    setMerchantPinInput('');
    setClaimError('');
    setClaimState('merchant_pin');
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    setClaimError('');
    setClaimLoading(true);
    setShake(false);

    const cleanPin = merchantPinInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setClaimError(t.wrongMerchantPin);
      setShake(true);
      setClaimLoading(false);
      return;
    }

    try {
      const data = await claimStep1(selectedCoupon.id, cleanPin);
      setClaimId(data.claim_id);
      setClaimExpiresAt(data.expires_at);
      setClaimState('waiting');
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('wrong_merchant_pin')) {
        setClaimError(t.wrongMerchantPin);
        setShake(true);
      } else if (msg.includes('coupon_not_available')) {
        setClaimError(t.claimFailed);
        loadCoupons();
      } else {
        setClaimError(t.claimFailed);
      }
    } finally {
      setClaimLoading(false);
    }
  };

  const handleCancelClaim = async () => {
    if (claimId) {
      try {
        await cancelMyClaim(claimId);
      } catch (e) {
        console.error(e);
      }
    }
    setSelectedCoupon(null);
    setClaimState('');
    loadCoupons();
  };

  const handleCloseModal = () => {
    setSelectedCoupon(null);
    setClaimState('');
    loadCoupons();
  };

  const name = isRtl ? (company?.name_ar || company?.name_en) : company?.name_en;
  const coverUrl = company?.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop';
  const logoUrl = company?.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';

  const availableCount = coupons.filter(c => c.status === 'available').length;
  const formattedCustomerPin = customerPin.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      direction: isRtl ? 'rtl' : 'ltr',
      paddingBottom: '60px'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-element {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes rotateDot {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
        .dot-pulse {
          display: inline-block;
          animation: rotateDot 1.4s infinite both;
        }
        .dot-pulse:nth-child(2) { animation-delay: .2s; }
        .dot-pulse:nth-child(3) { animation-delay: .4s; }
      `}} />

      {/* cover photo */}
      <div style={{
        width: '100%',
        height: '220px',
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 100%)'
        }} />

        {/* Back Button */}
        <button
          onClick={() => navigate('/customer')}
          style={{
            position: 'absolute',
            top: '20px',
            left: isRtl ? 'auto' : '20px',
            right: isRtl ? '20px' : 'auto',
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: 'none',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {isRtl ? '→' : '←'} {t.back}
        </button>

        {/* Top-Right controls */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: isRtl ? 'auto' : '20px',
          left: isRtl ? '20px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Always reachable "Your PIN" Chip */}
          <button
            onClick={() => setShowPinModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: 'var(--primary-color)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔑</span>
            <span>{t.yourPin}</span>
          </button>

          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>

      {/* Profile Header Block */}
      <div style={{
        maxWidth: '800px',
        margin: '-40px auto 0 auto',
        padding: '0 16px',
        position: 'relative',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '4px solid #FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ paddingBottom: '4px', textAlign: isRtl ? 'right' : 'left' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text)' }}>
              {name}
            </h2>
          </div>
        </div>

        {/* Navigation Tabs (Pill toggle style) */}
        <div style={{
          display: 'flex',
          background: '#F3F4F6',
          padding: '4px',
          borderRadius: '25px',
          gap: '4px',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => setTab('menu')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '21px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: tab === 'menu' ? 'var(--primary-color)' : 'transparent',
              color: tab === 'menu' ? '#FFFFFF' : 'var(--text-soft)',
              transition: 'all 0.2s'
            }}
          >
            {t.tabMenu}
          </button>
          <button
            onClick={() => setTab('offers')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '21px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: tab === 'offers' ? 'var(--primary-color)' : 'transparent',
              color: tab === 'offers' ? '#FFFFFF' : 'var(--text-soft)',
              transition: 'all 0.2s'
            }}
          >
            {t.tabOffers}
          </button>
        </div>

        {/* Tab Content Rendering */}
        {tab === 'menu' ? (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <PublicMenu slug={slug} isCustomerSpace={true} eligibleCouponCategories={eligibleCategories} />
          </div>
        ) : (
          <div>
            {/* Stat Bar */}
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(14, 124, 123, 0.08)',
              border: '1px solid rgba(14, 124, 123, 0.2)',
              borderRadius: '12px',
              color: 'var(--secondary-color)',
              fontWeight: '700',
              fontSize: '14px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              {t.remainingCoupons.replace('{count}', availableCount.toString())}
            </div>

            {/* Coupons Card list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {coupons.map(coupon => {
                const isAvailable = coupon.status === 'available';
                const isUsed = coupon.status === 'used';
                const isExpired = coupon.status === 'expired';

                let cardIcon = <ForkKnifeIcon />;
                let cardTitle = t.mainCourse;

                if (coupon.category === 'dessert') {
                  cardIcon = <CakeIcon />;
                  cardTitle = t.dessert;
                } else if (coupon.category === 'beverage') {
                  cardIcon = <WineGlassIcon />;
                  cardTitle = t.beverage;
                }

                return (
                  <div
                    key={coupon.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '20px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                      opacity: isAvailable ? 1 : 0.75,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        backgroundColor: isAvailable ? 'rgba(255, 87, 34, 0.08)' : '#F3F4F6',
                        color: isAvailable ? 'var(--primary-color)' : '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {cardIcon}
                      </div>

                      <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text)' }}>
                          {cardTitle}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 8px 0' }}>
                          {t.bogo}
                        </p>
                        
                        {/* Status badge */}
                        {isAvailable && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#16A34A',
                            backgroundColor: '#DCFCE7',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {t.available}
                          </span>
                        )}
                        {isUsed && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#4B5563',
                            backgroundColor: '#E5E7EB',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {t.usedAt.replace('{date}', coupon.used_at ? new Date(coupon.used_at).toLocaleDateString() : '')}
                          </span>
                        )}
                        {isExpired && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#DC2626',
                            backgroundColor: '#FEE2E2',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {t.expired}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {isAvailable && (
                        <button
                          onClick={() => handleStartClaim(coupon)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary-color)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          {t.claim}
                        </button>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                        {t.validUntil.replace('{year}', coupon.year || '2026')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Your PIN Modal (Always accessible) */}
      {showPinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 24px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
              {t.yourPinTitle}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 24px 0' }}>
              {t.yourPinSub}
            </p>

            <div style={{
              background: '#F9FAFB',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px 16px',
              fontFamily: 'monospace',
              fontSize: '26px',
              fontWeight: '700',
              letterSpacing: '4px',
              color: 'var(--text)',
              marginBottom: '30px'
            }}>
              {formattedCustomerPin}
            </div>

            <button
              onClick={() => setShowPinModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-color)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* 2-Step Claim Workflow Modal */}
      {selectedCoupon && claimState && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 24px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            boxSizing: 'border-box'
          }}>
            {/* STATE A: Enter merchant PIN */}
            {claimState === 'merchant_pin' && (
              <form onSubmit={handleStep1Submit}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
                  {t.enterMerchantPin}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  {t.merchantPinSub}
                </p>

                {claimError && (
                  <div style={{ color: '#DC2626', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                    {claimError}
                  </div>
                )}

                <input
                  type="tel"
                  maxLength={6}
                  required
                  placeholder="• • • • • •"
                  value={merchantPinInput}
                  onChange={e => setMerchantPinInput(e.target.value.replace(/\D/g, ''))}
                  disabled={claimLoading}
                  className={shake ? 'shake-element' : ''}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontFamily: 'monospace',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    marginBottom: '24px',
                    outline: 'none',
                    backgroundColor: '#F9FAFB'
                  }}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleCancelClaim}
                    disabled={claimLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={claimLoading || merchantPinInput.length !== 6}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-color)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      opacity: (claimLoading || merchantPinInput.length !== 6) ? 0.7 : 1
                    }}
                  >
                    {claimLoading ? '...' : t.submit}
                  </button>
                </div>
              </form>
            )}

            {/* STATE B: Waiting for authorization */}
            {claimState === 'waiting' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
                  {t.waitingAuth}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 20px 0' }}>
                  {t.waitingAuthSub}
                </p>

                {/* Diner's own PIN display */}
                <div style={{
                  background: '#F9FAFB',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  fontFamily: 'monospace',
                  fontSize: '28px',
                  fontWeight: '700',
                  letterSpacing: '4px',
                  color: 'var(--text)',
                  marginBottom: '16px'
                }}>
                  {formattedCustomerPin}
                </div>

                {/* Countdown */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#EA580C',
                  marginBottom: '20px'
                }}>
                  {t.expiresIn.replace('{time}', countdownText)}
                </div>

                {/* Loading spinner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-soft)', fontSize: '13px', marginBottom: '32px' }}>
                  <span>Waiting for staff</span>
                  <span style={{ display: 'inline-flex', gap: '2px' }}>
                    <span className="dot-pulse">.</span>
                    <span className="dot-pulse">.</span>
                    <span className="dot-pulse">.</span>
                  </span>
                </div>

                <button
                  onClick={handleCancelClaim}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            )}

            {/* STATE C: Success / Rejected / Expired */}
            {claimState === 'success' && (
              <div>
                <div style={{
                  display: 'inline-flex',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
                  {t.redeemedTitle}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 24px 0', lineHeight: '1.6' }}>
                  {t.enjoyMeal}
                </p>
                <button
                  onClick={handleCloseModal}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-color)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t.close}
                </button>
              </div>
            )}

            {claimState === 'rejected' && (
              <div>
                <div style={{
                  display: 'inline-flex',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
                  {t.tooManyAttempts}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 24px 0', lineHeight: '1.6' }}>
                  {t.wrongCustomerPin}
                </p>
                <button
                  onClick={handleCloseModal}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-color)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t.close}
                </button>
              </div>
            )}

            {claimState === 'expired' && (
              <div>
                <div style={{
                  display: 'inline-flex',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
                  {t.claimExpired}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-soft)', margin: '0 0 24px 0', lineHeight: '1.6' }}>
                  {t.claimExpired}
                </p>
                <button
                  onClick={handleCloseModal}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-color)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t.close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
