import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { supabase, isMockMode } from '../supabaseClient.js';
import { trackQuickOrder } from '../services/quickOrderService.js';
import {
  isPushSupported,
  isIOSSafari,
  ensureServiceWorker,
  subscribeForOrder,
} from '../lib/webPush.js';
import QSuccessToast from '../components/QSuccessToast.jsx';

const T = {
  en: {
    loading: 'Loading order tracker…',
    notFoundTitle: 'Order Not Found',
    notFoundDesc: 'We could not find an active order for this QR code. Please check with the counter staff.',
    orderLabel: 'Order Number',
    preparing: 'Preparing your order',
    preparingSub: 'Hang tight! We will alert you as soon as it is ready.',
    readyTitle: '🎉 Ready for pickup!',
    readySub: 'Please head to the counter and show your order number.',
    deliveredTitle: 'Order delivered. Enjoy!',
    deliveredSub: 'Thank you for visiting!',
    cancelledTitle: 'Order cancelled',
    cancelledReasonPrefix: 'Reason: ',
    enableAlertsBtn: '🔔 Enable Alerts',
    enableAlertsSub: "Get a buzz on your phone's lock screen when your order is ready.",
    enablingAlerts: 'Enabling alerts…',
    alertsOnChip: '✓ Alerts on for this device',
    turnOff: 'Turn off',
    allSetToast: "You're all set — put your phone away!",
    readyBanner: '✓ Your order is READY',
    unsupportedNotice:
      "Your browser can't buzz your phone's lock screen. Keep this page open — we'll make noise and show a big banner when your order is ready.",
    errPermissionDenied:
      'Notification permission was blocked. Please allow notifications in your browser settings or keep this page open.',
    errVapidMissing:
      'Push alerts are being configured. Please keep this page open — we will alert you right here!',
    errGeneric: 'Could not enable lock-screen alerts. Keep this page open to see live updates.',
    iosTitle: 'Add to Home Screen First',
    iosDesc: 'To get buzz-on-lock-screen alerts on iPhone, add this page to your Home Screen first.',
    iosStep1: '1. Tap the 📤 Share icon at the bottom of Safari',
    iosStep2: '2. Scroll down and tap ➕ Add to Home Screen',
    iosStep3: '3. Open the app from your Home Screen and tap Enable Alerts',
    iosDismiss: 'Got it',
    poweredBy: 'Powered by QriousQR',
    langToggle: 'العربية',
  },
  ar: {
    loading: 'جاري تحميل متتبع الطلب…',
    notFoundTitle: 'الطلب غير موجود',
    notFoundDesc: 'لم نتمكن من العثور على طلب مرتبط برمز QR هذا. يرجى مراجعة موظف الكاونتر.',
    orderLabel: 'رقم الطلب',
    preparing: 'جاري تحضير طلبك',
    preparingSub: 'يرجى الانتظار! سنقوم بتنبيهك فور جهوزية طلبك.',
    readyTitle: '🎉 طلبك جاهز للاستلام!',
    readySub: 'يرجى التوجه إلى الكاونتر وإبراز رقم طلبك.',
    deliveredTitle: 'تم تسليم الطلب. صحتين!',
    deliveredSub: 'شكراً لزيارتكم!',
    cancelledTitle: 'تم إلغاء الطلب',
    cancelledReasonPrefix: 'السبب: ',
    enableAlertsBtn: '🔔 تفعيل التنبيهات',
    enableAlertsSub: 'احصل على اهتزاز وتنبيه على شاشة القفل عندما يصبح طلبك جاهزاً.',
    enablingAlerts: 'جاري التفعيل…',
    alertsOnChip: '✓ التنبيهات مفعّلة لهذا الجهاز',
    turnOff: 'إيقاف',
    allSetToast: 'تم التفعيل بنجاح — يمكنك قفل هاتفك الآن!',
    readyBanner: '✓ طلبك جاهز للاستلام الآن',
    unsupportedNotice:
      'متصفحك لا يدعم تنبيهات شاشة القفل. أبقِ هذه الصفحة مفتوحة — سنصدر صوتاً وإشعاراً واضحاً فور جهوزية طلبك.',
    errPermissionDenied:
      'تم حظر إذن الإشعارات. يرجى السماح بالإشعارات من إعدادات المتصفح أو إبقاء هذه الصفحة مفتوحة.',
    errVapidMissing: 'يتم تهيئة تنبيهات الدفع. يرجى إبقاء هذه الصفحة مفتوحة وسننبهك هنا مباشرة!',
    errGeneric: 'تعذر تفعيل تنبيهات شاشة القفل. أبقِ هذه الصفحة مفتوحة لمتابعة حالة الطلب.',
    iosTitle: 'أضف الصفحة إلى الشاشة الرئيسية أولاً',
    iosDesc: 'للحصول على تنبيهات شاشة القفل على iPhone، أضف هذه الصفحة إلى الشاشة الرئيسية أولاً.',
    iosStep1: '1. اضغط على أيقونة المشاركة 📤 في أسفل متصفح Safari',
    iosStep2: '2. مرر لأسفل واضغط على ➕ إضافة إلى الصفحة الرئيسية',
    iosStep3: '3. افتح الصفحة من شاشتك الرئيسية واضغط على تفعيل التنبيهات',
    iosDismiss: 'حسناً',
    poweredBy: 'مشغّل بواسطة QriousQR',
    langToggle: 'English',
  },
};

function playReadyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [660, 880, 1100];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.16;
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {}
}

export default function QuickOrderTracker() {
  const { qrToken } = useParams();
  const { lang, toggleLang, isRTL } = useLang();
  const t = T[lang] || T.en;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Push states
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [showIOSOverlay, setShowIOSOverlay] = useState(false);

  // Toast & Ready Banner states
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const prevStatusRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const { iOS, standalone } = isIOSSafari();
  const needsIOSHomeScreen = iOS && !standalone;
  const pushSupported = isPushSupported() || needsIOSHomeScreen;

  // Check if browser already has an active subscription on mount
  useEffect(() => {
    if (!isPushSupported()) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.pushManager) {
          const existing = await reg.pushManager.getSubscription();
          if (existing && Notification.permission === 'granted') {
            // Ensure this order's qrToken is registered for this device subscription
            try {
              await subscribeForOrder(qrToken);
              setSubscribed(true);
            } catch {}
          }
        }
      } catch {}
    })();
  }, [qrToken]);

  const triggerReadyAlertEffects = (orderNum) => {
    playReadyChime();
    try {
      if (navigator.vibrate) {
        navigator.vibrate([400, 150, 400, 150, 400]);
      }
    } catch {}
    setShowReadyBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setShowReadyBanner(false);
    }, 10000);
    if (typeof document !== 'undefined') {
      document.title = `🔔 READY — Order #${orderNum}`;
    }
  };

  const fetchTrackerData = async () => {
    try {
      const data = await trackQuickOrder(qrToken);
      if (data) {
        if (prevStatusRef.current && prevStatusRef.current !== 'ready' && data.status === 'ready') {
          triggerReadyAlertEffects(data.order_number);
        } else if (!prevStatusRef.current && data.status === 'ready') {
          if (typeof document !== 'undefined') {
            document.title = `🔔 READY — Order #${data.order_number}`;
          }
        }
        prevStatusRef.current = data.status;
      }
      setOrder(data);
    } catch (err) {
      console.error('Error tracking quick order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!qrToken) return;
    fetchTrackerData();

    let channel = null;
    if (!isMockMode && supabase) {
      try {
        channel = supabase
          .channel(`track_quick_order:${qrToken}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'quick_orders', filter: `qr_token=eq.${qrToken}` },
            () => fetchTrackerData()
          )
          .subscribe();
      } catch (err) {
        console.error('Realtime tracker subscription error:', err);
      }
    }

    const interval = setInterval(fetchTrackerData, 6000);

    const handleStorage = (e) => {
      if (!e.key || e.key === 'qriousqr:mock_quick_orders') {
        fetchTrackerData();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleFocus = () => fetchTrackerData();
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [qrToken]);

  const handleEnableAlerts = async () => {
    setPushError('');
    if (needsIOSHomeScreen) {
      setShowIOSOverlay(true);
      return;
    }

    setSubscribing(true);
    try {
      await subscribeForOrder(qrToken);
      setSubscribed(true);
      setToastMessage(t.allSetToast);
      setToastVisible(true);
    } catch (err) {
      console.error('subscribeForOrder error:', err);
      const code = (err.message || '').toLowerCase();
      if (code.includes('permission_denied')) {
        setPushError(t.errPermissionDenied);
      } else if (code.includes('vapid_public_key_missing')) {
        setPushError(t.errVapidMissing);
      } else {
        setPushError(t.errGeneric);
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleTurnOffAlerts = async () => {
    try {
      const reg = await ensureServiceWorker();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
    } catch {}
    setSubscribed(false);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F5',
          fontFamily: isRTL ? 'var(--font-ar)' : 'var(--font-en)',
          direction: isRTL ? 'rtl' : 'ltr',
          color: '#14110F',
        }}
      >
        <h3>{t.loading}</h3>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F5',
          padding: '24px',
          textAlign: 'center',
          fontFamily: isRTL ? 'var(--font-ar)' : 'var(--font-en)',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '36px 24px',
            maxWidth: '400px',
            width: '100%',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔍</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800' }}>{t.notFoundTitle}</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
            {t.notFoundDesc}
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = order.company_primary_color || '#FF5722';
  const restaurantName = isRTL
    ? order.company_name_ar || order.company_name_en || order.company_name || 'QriousQR'
    : order.company_name_en || order.company_name || order.company_name_ar || 'QriousQR';

  // Status Card Theme
  let cardBg = primaryColor;
  let cardText = '#FFFFFF';
  let statusHeading = t.preparing;
  let statusSub = t.preparingSub;

  if (order.status === 'ready') {
    cardBg = '#0E7C7B';
    cardText = '#FFFFFF';
    statusHeading = t.readyTitle;
    statusSub = t.readySub;
  } else if (order.status === 'delivered') {
    cardBg = '#F3F4F6';
    cardText = '#1F2937';
    statusHeading = t.deliveredTitle;
    statusSub = t.deliveredSub;
  } else if (order.status === 'cancelled') {
    cardBg = '#FEE2E2';
    cardText = '#991B1B';
    statusHeading = t.cancelledTitle;
    statusSub = order.cancelled_reason ? `${t.cancelledReasonPrefix}${order.cancelled_reason}` : '';
  }

  const isOrderActive = order.status === 'pending' || order.status === 'ready';

  return (
    <div
      style={{
        '--primary-color': primaryColor,
        minHeight: '100vh',
        backgroundColor: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily: isRTL ? 'var(--font-ar)' : 'var(--font-en)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <style>{`
        @keyframes trackerPulseDots {
          0%, 20% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.25; transform: scale(0.9); }
        }
        @keyframes readyBannerDrop {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <QSuccessToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      {/* 10s Big Orange Ready Overlay Banner */}
      {showReadyBanner && (
        <div
          onClick={() => setShowReadyBanner(false)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            backgroundColor: '#FF5722',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '14px',
            fontWeight: '900',
            fontSize: '18px',
            boxShadow: '0 16px 32px rgba(255, 87, 34, 0.4)',
            textAlign: 'center',
            width: 'calc(100% - 32px)',
            maxWidth: '420px',
            cursor: 'pointer',
            animation: 'readyBannerDrop 0.3s ease-out',
          }}
        >
          {t.readyBanner} — #{order.order_number}
        </div>
      )}

      {/* Top: Restaurant Logo + Name */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '10px',
          marginTop: '8px',
        }}
      >
        {order.company_logo_url && (
          <img
            src={order.company_logo_url}
            alt={restaurantName}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              objectFit: 'cover',
              border: '2px solid #FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#14110F' }}>
          {restaurantName}
        </h1>
      </header>

      {/* Center: Big Status Card + Enable Alerts Block */}
      <main
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '24px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Status Card */}
        <div
          style={{
            backgroundColor: cardBg,
            color: cardText,
            borderRadius: '24px',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow:
              order.status === 'ready'
                ? '0 20px 40px rgba(14, 124, 123, 0.3)'
                : order.status === 'pending'
                ? '0 20px 40px rgba(255, 87, 34, 0.22)'
                : '0 8px 24px rgba(0,0,0,0.05)',
            transition: 'all 0.35s ease',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: 0.85,
              marginBottom: '6px',
            }}
          >
            {t.orderLabel}
          </div>

          <div
            style={{
              fontSize: '54px',
              fontWeight: '900',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              lineHeight: 1.05,
              marginBottom: '20px',
            }}
          >
            #{order.order_number}
          </div>

          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '22px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>{statusHeading}</span>
            {order.status === 'pending' && (
              <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      display: 'inline-block',
                      animation: `trackerPulseDots 1.4s infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </span>
            )}
          </h2>

          {statusSub && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.5,
                opacity: 0.92,
                fontWeight: '500',
              }}
            >
              {statusSub}
            </p>
          )}
        </div>

        {/* Enable Alerts Block (shown while order is active) */}
        {isOrderActive && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '22px 20px',
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            {/* State C — Push already enabled */}
            {subscribed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: '800',
                  }}
                >
                  {t.alertsOnChip}
                </div>
                <button
                  type="button"
                  onClick={handleTurnOffAlerts}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-soft)',
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {t.turnOff}
                </button>
              </div>
            ) : pushSupported ? (
              /* State A (supported) or State B (iOS Safari non-standalone) */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleEnableAlerts}
                  disabled={subscribing}
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: primaryColor,
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(255, 87, 34, 0.25)',
                    opacity: subscribing ? 0.7 : 1,
                  }}
                >
                  {subscribing ? t.enablingAlerts : t.enableAlertsBtn}
                </button>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                  {t.enableAlertsSub}
                </p>
                {pushError && (
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: '#DC2626',
                      fontWeight: '600',
                      lineHeight: 1.4,
                    }}
                  >
                    {pushError}
                  </p>
                )}
              </div>
            ) : (
              /* State D — Platform does NOT support Web Push */
              <div
                style={{
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#9A3412',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  fontWeight: '600',
                }}
              >
                {t.unsupportedNotice}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer: Powered by QriousQR + Language Toggle */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          fontSize: '12px',
          color: 'var(--text-soft)',
          paddingBottom: '8px',
        }}
      >
        <span>{t.poweredBy}</span>
        <span>•</span>
        <button
          type="button"
          onClick={toggleLang}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#14110F',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {t.langToggle}
        </button>
      </footer>

      {/* State B — iOS Safari Add to Home Screen Explainer Overlay */}
      {showIOSOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 17, 15, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowIOSOverlay(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '22px',
              padding: '28px 24px',
              maxWidth: '380px',
              width: '100%',
              textAlign: isRTL ? 'right' : 'left',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '10px' }}>📲</div>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: '900',
                textAlign: 'center',
                color: '#14110F',
              }}
            >
              {t.iosTitle}
            </h3>
            <p
              style={{
                margin: '0 0 18px 0',
                fontSize: '13.5px',
                color: 'var(--text-soft)',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {t.iosDesc}
            </p>

            <div
              style={{
                backgroundColor: '#FAF8F5',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#14110F',
                marginBottom: '20px',
              }}
            >
              <div>{t.iosStep1}</div>
              <div>{t.iosStep2}</div>
              <div>{t.iosStep3}</div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSOverlay(false)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              {t.iosDismiss}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
