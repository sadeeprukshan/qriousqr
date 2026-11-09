import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { supabase, isMockMode } from '../supabaseClient.js';
import { trackQuickOrder } from '../services/quickOrderService.js';
import { isPushSupported, isIOSSafari, subscribeForOrder } from '../lib/webPush.js';
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
    enableAlertsBtn: '🔔 Notify me when ready',
    enableAlertsSub: 'Tap, then choose "Allow". You will get a notification on your phone even when it is locked.',
    enablingAlerts: 'Enabling…',
    alertsOnChip: '✓ Notifications on',
    alertsOnSub: 'You can lock your phone. Tap the notification when it arrives to open your order.',
    turnOff: 'Turn off',
    allSetToast: "You're all set — you can lock your phone now.",
    readyBanner: '✓ Your order is READY',
    errPermissionDenied: 'Notifications are blocked for this site. Allow them in your browser settings, or keep this page open.',
    errVapidMissing: 'Notifications are not configured yet. Keep this page open — we will alert you here.',
    errGeneric: 'Could not turn on notifications. Keep this page open — we will alert you here.',
    iosNote: 'iPhone: Apple only allows lock-screen notifications for sites added to the Home Screen (Share ➜ Add to Home Screen). Otherwise, keep this page open and we will chime when your order is ready.',
    unsupportedNote: 'This browser cannot show notifications. Keep this page open — we will chime when your order is ready.',
    keepOpenBtn: '🔊 Turn on sound alert',
    keepOpenOn: '✓ Sound alert on — keep this page open',
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
    enableAlertsBtn: '🔔 نبّهني عند الجهوزية',
    enableAlertsSub: 'اضغط ثم اختر "السماح". سيصلك إشعار على هاتفك حتى وهو مقفل.',
    enablingAlerts: 'جاري التفعيل…',
    alertsOnChip: '✓ الإشعارات مفعّلة',
    alertsOnSub: 'يمكنك قفل هاتفك. اضغط على الإشعار عند وصوله لفتح طلبك.',
    turnOff: 'إيقاف',
    allSetToast: 'تم التفعيل — يمكنك قفل هاتفك الآن.',
    readyBanner: '✓ طلبك جاهز للاستلام الآن',
    errPermissionDenied: 'الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح أو أبقِ هذه الصفحة مفتوحة.',
    errVapidMissing: 'الإشعارات غير مهيأة بعد. أبقِ هذه الصفحة مفتوحة وسننبهك هنا.',
    errGeneric: 'تعذر تفعيل الإشعارات. أبقِ هذه الصفحة مفتوحة وسننبهك هنا.',
    iosNote: 'آيفون: تسمح Apple بإشعارات شاشة القفل فقط للمواقع المضافة إلى الشاشة الرئيسية (مشاركة ➜ إضافة إلى الشاشة الرئيسية). وإلا أبقِ هذه الصفحة مفتوحة وسنصدر صوتاً عند جهوزية طلبك.',
    unsupportedNote: 'هذا المتصفح لا يدعم الإشعارات. أبقِ هذه الصفحة مفتوحة وسنصدر صوتاً عند جهوزية طلبك.',
    keepOpenBtn: '🔊 تفعيل التنبيه الصوتي',
    keepOpenOn: '✓ التنبيه الصوتي مفعّل — أبقِ الصفحة مفتوحة',
    poweredBy: 'مشغّل بواسطة QriousQR',
    langToggle: 'English',
  },
};

// Mobile browsers start an AudioContext muted unless it is created/resumed
// during a user tap. We unlock one shared context on the Enable tap and
// reuse it for the ready chime.
let sharedAudioCtx = null;
function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
    // Play a 1-sample silent buffer — required by iOS Safari to fully unlock
    const buf = sharedAudioCtx.createBuffer(1, 1, 22050);
    const src = sharedAudioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedAudioCtx.destination);
    src.start(0);
  } catch {}
}

function playReadyChime() {
  try {
    const ctx = sharedAudioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const notes = [660, 880, 1100, 880, 1320];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
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

  // Alert state — Web Push (browser notification) is the primary channel
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [soundOn, setSoundOn] = useState(false); // keep-page-open fallback

  // Toast & Ready Banner states
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const prevStatusRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const { iOS, standalone } = isIOSSafari();
  const pushSupported = isPushSupported();
  const iosNeedsHomeScreen = iOS && !standalone && !pushSupported;

  // Revisit: if this browser already granted permission, silently attach
  // its existing subscription to this order so it gets the push too.
  useEffect(() => {
    if (!pushSupported || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    (async () => {
      try {
        await subscribeForOrder(qrToken);
        setSubscribed(true);
      } catch {}
    })();
  }, [qrToken]);

  const triggerReadyAlertEffects = (orderNum) => {
    // In-page sound + banner for users who are looking at the tab
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
    unlockAudio(); // must run inside the tap so the in-page chime can play later
    setSubscribing(true);
    try {
      // Browser push notification (Web Push) — banner on the lock screen,
      // tapping it opens this order page. Permission prompt fires here.
      await subscribeForOrder(qrToken);
      setSubscribed(true);
      setSoundOn(true);
      setToastMessage(t.allSetToast);
      setToastVisible(true);
    } catch (err) {
      console.error('subscribeForOrder error:', err);
      const code = (err?.message || '').toLowerCase();
      if (code.includes('permission_denied')) setPushError(t.errPermissionDenied);
      else if (code.includes('vapid_public_key_missing')) setPushError(t.errVapidMissing);
      else setPushError(t.errGeneric);
      setSoundOn(true); // still chime in-page as fallback
    } finally {
      setSubscribing(false);
    }
  };

  const handleEnableSoundOnly = () => {
    unlockAudio();
    setSoundOn(true);
  };

  const handleTurnOffAlerts = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
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
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                  {t.alertsOnSub}
                </p>
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
            ) : !pushSupported ? (
              /* No Web Push here (iPhone Safari tab, or old browser): honest note + in-page sound fallback */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#9A3412', backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '12px 14px', lineHeight: 1.5, fontWeight: '600' }}>
                  {iosNeedsHomeScreen ? t.iosNote : t.unsupportedNote}
                </p>
                {soundOn ? (
                  <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '800' }}>
                    {t.keepOpenOn}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnableSoundOnly}
                    style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', backgroundColor: primaryColor, color: '#FFFFFF', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {t.keepOpenBtn}
                  </button>
                )}
              </div>
            ) : (
              /* Web Push — browser notification banner, works with the phone locked */
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

      {/* iOS Add-to-Home-Screen overlay removed — Media Session API works without it. */}
    </div>
  );
}
