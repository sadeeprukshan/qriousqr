import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { supabase, isMockMode } from '../supabaseClient.js';
import { trackQuickOrder } from '../services/quickOrderService.js';
import { isPushSupported, subscribeForOrder } from '../lib/webPush.js';
import { OrderAlertPlayer } from '../lib/orderAlertPlayer.js';
import { markOrderViewed } from '../services/counterService.js';
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
    promptTitle: 'Get alerted when your order is ready?',
    promptBodyPush: 'Tap OK, then "Allow". Your phone will ring and show a notification, even when it is locked.',
    promptBodyPlayer: 'Tap OK. Your phone will ring when your order is ready, even when it is locked. Don’t close this page.',
    promptOk: 'OK',
    promptLater: 'Not now',
    enableAlertsBtn: '🔔 Alert me when ready',
    enablingAlerts: 'Enabling…',
    alertsOnChip: '✓ Alerts on — you can lock your phone',
    alertsOnSubPush: 'Your phone will ring and show a notification when your order is ready.',
    alertsOnSubPlayer: 'Your phone will ring when your order is ready. Don’t close this page; locking the phone is fine.',
    stopAlarm: '🔕 Stop alarm',
    turnOff: 'Turn off alerts',
    allSetToast: "You're all set — you can lock your phone now.",
    readyBanner: '✓ Your order is READY',
    readyBannerHigh: '🚨 Please come to the counter NOW',
    errPermissionDenied: 'Notifications are blocked for this site, but the ringing alert is on. Don’t close this page.',
    errGeneric: 'Notifications could not be turned on, but the ringing alert is on. Don’t close this page.',
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
    promptTitle: 'هل تريد تنبيهاً عند جهوزية طلبك؟',
    promptBodyPush: 'اضغط موافق ثم «السماح». سيرنّ هاتفك ويظهر إشعار حتى وهو مقفل.',
    promptBodyPlayer: 'اضغط موافق. سيرنّ هاتفك عند جهوزية طلبك حتى وهو مقفل. لا تغلق هذه الصفحة.',
    promptOk: 'موافق',
    promptLater: 'ليس الآن',
    enableAlertsBtn: '🔔 نبّهني عند الجهوزية',
    enablingAlerts: 'جاري التفعيل…',
    alertsOnChip: '✓ التنبيه مفعّل — يمكنك قفل هاتفك',
    alertsOnSubPush: 'سيرنّ هاتفك ويظهر إشعار عند جهوزية طلبك.',
    alertsOnSubPlayer: 'سيرنّ هاتفك عند جهوزية طلبك. لا تغلق هذه الصفحة، ويمكنك قفل الهاتف.',
    stopAlarm: '🔕 إيقاف الرنين',
    turnOff: 'إيقاف التنبيهات',
    allSetToast: 'تم التفعيل — يمكنك قفل هاتفك الآن.',
    readyBanner: '✓ طلبك جاهز للاستلام الآن',
    readyBannerHigh: '🚨 يرجى التوجه إلى الكاونتر الآن',
    errPermissionDenied: 'الإشعارات محظورة لهذا الموقع، لكن التنبيه بالرنين مفعّل. لا تغلق هذه الصفحة.',
    errGeneric: 'تعذر تفعيل الإشعارات، لكن التنبيه بالرنين مفعّل. لا تغلق هذه الصفحة.',
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

  // Alerts = two channels started by one OK tap:
  //  1. Lock-screen player (all phones): keeps the page alive while locked, rings on ready
  //  2. Web Push notification (where the browser allows it, e.g. Android Chrome)
  const [alertsOn, setAlertsOn] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [ringing, setRinging] = useState(false);

  // Toast & Ready Banner states
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [bannerHigh, setBannerHigh] = useState(false);

  const prevStatusRef = useRef(null);
  const prevAlertSeqRef = useRef(null); // operator "Notify again" / "High alert" bumps this
  const bannerTimerRef = useRef(null);
  const playerRef = useRef(null);
  if (!playerRef.current) playerRef.current = new OrderAlertPlayer();

  const pushSupported = isPushSupported();

  useEffect(() => {
    const player = playerRef.current;
    player.onRingingChange = setRinging;
    return () => player.stop();
  }, []);

  // Keep the lock-screen card in sync with the order status and language
  useEffect(() => {
    if (order?.status) playerRef.current.setStatus(order.status);
    if (order && (order.status === 'delivered' || order.status === 'cancelled')) setAlertsOn(false);
  }, [order?.status]);

  useEffect(() => {
    playerRef.current.setLang(lang);
  }, [lang]);

  // Tell the counter tablet this order was scanned, so it can show the next one
  useEffect(() => {
    if (qrToken) markOrderViewed(qrToken);
  }, [qrToken]);

  // The "message": ask once, as soon as an active order is on screen
  useEffect(() => {
    const active = order && (order.status === 'pending' || order.status === 'ready');
    if (active && !alertsOn && !promptDismissed) setShowPrompt(true);
  }, [order?.status, alertsOn, promptDismissed]);

  // Make "Add to Home Screen" open THIS order. The tracker manifest has no
  // start_url, so browsers use this page's URL. The icon is named after the order.
  useEffect(() => {
    if (!order?.order_number) return;
    const link = document.getElementById('app-manifest');
    const prevHref = link?.getAttribute('href');
    link?.setAttribute('href', '/manifest-track.webmanifest');

    let titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const createdMeta = !titleMeta;
    if (!titleMeta) {
      titleMeta = document.createElement('meta');
      titleMeta.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(titleMeta);
    }
    const prevAppTitle = titleMeta.getAttribute('content');
    titleMeta.setAttribute('content', `Order #${order.order_number}`);

    return () => {
      if (prevHref) link?.setAttribute('href', prevHref);
      if (createdMeta) titleMeta.remove();
      else titleMeta.setAttribute('content', prevAppTitle || '');
    };
  }, [order?.order_number]);

  // Revisit: if this browser already granted permission, silently attach
  // its existing subscription to this order so it gets the push too.
  useEffect(() => {
    if (!pushSupported || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    subscribeForOrder(qrToken).catch(() => {});
  }, [qrToken]);

  const triggerReadyAlertEffects = (orderNum) => {
    // The lock-screen player rings by itself (setStatus effect). Only chime
    // in-page if the customer never turned alerts on.
    if (!playerRef.current.active) {
      playReadyChime();
      try { navigator.vibrate && navigator.vibrate([400, 150, 400, 150, 400]); } catch {}
    }
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

        // Operator pressed "Notify again" or "High alert"
        const seq = data.alert_seq ?? 0;
        if (prevAlertSeqRef.current !== null && seq > prevAlertSeqRef.current && data.status === 'ready') {
          const level = data.alert_level === 'high' ? 'high' : 'normal';
          if (playerRef.current.active) {
            playerRef.current.ring(level);
          } else {
            playReadyChime();
            try { navigator.vibrate && navigator.vibrate([600, 150, 600, 150, 600]); } catch {}
          }
          setBannerHigh(level === 'high');
          setShowReadyBanner(true);
          if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
          bannerTimerRef.current = setTimeout(() => setShowReadyBanner(false), 15000);
        }
        prevAlertSeqRef.current = seq;
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
    setShowPrompt(false);
    setPushError('');
    // Both must start synchronously inside this tap — no `await` before them.
    unlockAudio();
    const playStarted = playerRef.current.start({
      orderNumber: order.order_number,
      restaurantName,
      logoUrl: order.company_logo_url || null,
      lang,
    });
    const pushStarted = pushSupported ? subscribeForOrder(qrToken) : null; // shows "Allow" prompt
    pushStarted?.catch(() => {}); // handled below; avoids an "uncaught" log while the player starts

    try {
      await playStarted;
    } catch (err) {
      console.error('player start failed', err);
    }
    setAlertsOn(true);
    if (order.status === 'ready') playerRef.current.ring();

    if (pushStarted) {
      setSubscribing(true);
      try {
        await pushStarted;
      } catch (err) {
        console.warn('push subscribe failed (player still active):', err);
        const code = (err?.message || '').toLowerCase();
        setPushError(code.includes('permission_denied') ? t.errPermissionDenied : t.errGeneric);
      } finally {
        setSubscribing(false);
      }
    }
    setToastMessage(t.allSetToast);
    setToastVisible(true);
  };

  const handleStopAlarm = () => {
    playerRef.current.stopRinging();
  };

  const handleTurnOffAlerts = async () => {
    playerRef.current.stop();
    setAlertsOn(false);
    setPromptDismissed(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
      }
    } catch {}
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
            backgroundColor: bannerHigh ? '#DC2626' : '#FF5722',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '14px',
            fontWeight: '900',
            fontSize: '18px',
            boxShadow: bannerHigh ? '0 16px 32px rgba(220, 38, 38, 0.45)' : '0 16px 32px rgba(255, 87, 34, 0.4)',
            textAlign: 'center',
            width: 'calc(100% - 32px)',
            maxWidth: '420px',
            cursor: 'pointer',
            animation: 'readyBannerDrop 0.3s ease-out',
          }}
        >
          {bannerHigh ? t.readyBannerHigh : t.readyBanner} — #{order.order_number}
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

        {/* Alerts block (shown while order is active) */}
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
            {alertsOn ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                {ringing ? (
                  <button
                    type="button"
                    onClick={handleStopAlarm}
                    style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: 'none', backgroundColor: '#0E7C7B', color: '#FFFFFF', fontSize: '17px', fontWeight: '900', cursor: 'pointer' }}
                  >
                    {t.stopAlarm}
                  </button>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', color: '#166534', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: '800' }}>
                    {t.alertsOnChip}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-soft)', lineHeight: 1.45 }}>
                  {pushSupported && !pushError ? t.alertsOnSubPush : t.alertsOnSubPlayer}
                </p>
                {pushError && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#B45309', fontWeight: '600', lineHeight: 1.4 }}>
                    {pushError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleTurnOffAlerts}
                  style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  {t.turnOff}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEnableAlerts}
                disabled={subscribing}
                style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: 'none', backgroundColor: primaryColor, color: '#FFFFFF', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255, 87, 34, 0.25)', opacity: subscribing ? 0.7 : 1 }}
              >
                {subscribing ? t.enablingAlerts : t.enableAlertsBtn}
              </button>
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

      {/* The "message": one OK starts the ringing player + asks for notifications */}
      {showPrompt && !alertsOn && isOrderActive && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1300, backgroundColor: 'rgba(20, 17, 15, 0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '22px', padding: '26px 22px 20px', width: '100%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>🔔</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '900', color: '#14110F' }}>{t.promptTitle}</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '14px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
              {pushSupported ? t.promptBodyPush : t.promptBodyPlayer}
            </p>
            <button
              type="button"
              onClick={handleEnableAlerts}
              style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', backgroundColor: primaryColor, color: '#FFFFFF', fontSize: '17px', fontWeight: '900', cursor: 'pointer' }}
            >
              {t.promptOk}
            </button>
            <button
              type="button"
              onClick={() => { setShowPrompt(false); setPromptDismissed(true); }}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '13px', cursor: 'pointer', padding: '6px' }}
            >
              {t.promptLater}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
