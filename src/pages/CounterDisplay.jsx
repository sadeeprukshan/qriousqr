import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { pairDisplay, getDisplayState, getDeviceToken, clearDeviceToken } from '../services/counterService.js';

// Customer-facing counter tablet. Paired once with a 6-digit code from the Dashboard,
// then shows the newest order's QR (or the receipt-number check-in QR) plus a pickup board.

const POLL_MS = 3000;
const FEATURE_WINDOW_MS = 10 * 60 * 1000; // feature a new order for up to 10 minutes or until scanned

function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch {}
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      try { lock && lock.release(); } catch {}
    };
  }, [active]);
}

function PairingScreen({ onPaired }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      await pairDisplay(code);
      onPaired();
    } catch (err) {
      const m = (err.message || '').toLowerCase();
      setError(m.includes('rate_limited')
        ? 'Too many attempts. Wait a minute and try again.'
        : 'That code is wrong or expired. Create a new one in the Dashboard.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-en)' }}>
      <form onSubmit={submit} style={{ background: '#FFFFFF', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '44px' }}>📺</div>
        <h1 style={{ margin: '10px 0 6px', fontSize: '24px', fontWeight: 900, color: '#14110F' }}>Pair this counter display</h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>
          In the QriousQR Dashboard, open <strong>Counter &amp; POS</strong>, tap <strong>Add display</strong>, and enter the 6-digit code here.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
          placeholder="000000"
          aria-label="Pairing code"
          style={{ width: '100%', boxSizing: 'border-box', padding: '16px', fontSize: '36px', fontWeight: 900, letterSpacing: '0.35em', textAlign: 'center', fontFamily: 'monospace', border: '2px solid #E5E7EB', borderRadius: '14px', outline: 'none', background: '#FAF8F5' }}
        />
        {error && <p style={{ margin: '12px 0 0', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          style={{ marginTop: '20px', width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: '#FF5722', color: '#FFFFFF', fontSize: '17px', fontWeight: 900, cursor: 'pointer', opacity: busy || code.length !== 6 ? 0.55 : 1 }}
        >
          {busy ? 'Pairing…' : 'Pair display'}
        </button>
      </form>
    </div>
  );
}

function OrderList({ title, titleAr, orders, color, big }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: big ? '22px' : '17px', fontWeight: 900, color }}>{title}</h3>
        <span style={{ fontSize: big ? '20px' : '16px', fontWeight: 800, color, fontFamily: 'var(--font-ar)' }}>{titleAr}</span>
      </div>
      {orders.length === 0 ? (
        <div style={{ color: '#9CA3AF', fontSize: '15px', padding: '8px 0' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {orders.map((o) => (
            <span
              key={o.qr_token}
              style={{
                fontFamily: 'monospace', fontWeight: 900,
                fontSize: big ? '30px' : '20px',
                padding: big ? '10px 16px' : '6px 12px',
                borderRadius: '12px',
                color: big ? '#FFFFFF' : '#374151',
                background: big ? color : '#F3F4F6',
                animation: big && o._fresh ? 'counterPulse 1s ease-in-out 6' : 'none',
              }}
            >
              #{o.order_number}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CounterDisplay() {
  const [token, setToken] = useState(() => getDeviceToken());
  const [state, setState] = useState(null);
  const [offline, setOffline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const readySeenRef = useRef(new Map()); // qr_token -> first time we saw it ready

  useWakeLock(!!token);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const s = await getDisplayState(token);
      setState(s);
      setOffline(false);
    } catch (err) {
      const m = (err.message || '').toLowerCase();
      if (m.includes('display_revoked')) {
        clearDeviceToken();
        setToken(null);
        setState(null);
      } else {
        setOffline(true); // network blip: keep showing the last screen
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
    const t = setInterval(load, POLL_MS);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [token, load]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'QriousQR Counter Display';
    return () => { document.title = prev; };
  }, []);

  if (!token) return <PairingScreen onPaired={() => setToken(getDeviceToken())} />;

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5', color: '#6B7280', fontSize: '18px' }}>
        {offline ? 'Connecting…' : 'Loading…'}
      </div>
    );
  }

  const origin = window.location.origin;
  const color = state.company?.primary_color || '#FF5722';
  const orders = state.orders || [];
  const now = Date.now();

  // Featured: newest pending order nobody has scanned yet, created in the last 10 minutes
  const featured = orders.find(
    (o) => o.status === 'pending' && !o.viewed_at && now - new Date(o.created_at).getTime() < FEATURE_WINDOW_MS
  );

  // Ready list: highlight numbers that just turned ready (first seen < 15 s ago)
  const ready = orders
    .filter((o) => o.status === 'ready')
    .map((o) => {
      if (!readySeenRef.current.has(o.qr_token)) readySeenRef.current.set(o.qr_token, now);
      return { ...o, _fresh: now - readySeenRef.current.get(o.qr_token) < 15000 };
    });
  const preparing = orders.filter((o) => o.status === 'pending');

  const qrValue = featured ? `${origin}/track/${featured.qr_token}` : `${origin}/checkin/${state.checkin_code}`;

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-en)', '--accent': color }}>
      <style>{`
        @keyframes counterPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes counterIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .counter-body { display: flex; gap: 24px; padding: 24px; flex: 1; align-items: stretch; }
        @media (max-width: 860px) { .counter-body { flex-direction: column; } }
      `}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 24px', background: '#FFFFFF', borderBottom: '1px solid #EEE' }}>
        {state.company?.logo_url && (
          <img src={state.company.logo_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#14110F' }}>{state.company?.name_en}</div>
          {state.company?.name_ar && (
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#6B7280', fontFamily: 'var(--font-ar)' }}>{state.company.name_ar}</div>
          )}
        </div>
        {offline && <span style={{ fontSize: '13px', fontWeight: 700, color: '#B45309' }}>● Reconnecting…</span>}
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          aria-label="Display settings"
          style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: '#9CA3AF', padding: '6px' }}
        >
          ⚙
        </button>
      </header>

      {showMenu && (
        <div style={{ position: 'absolute', top: '84px', right: '24px', zIndex: 10, background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', padding: '8px', minWidth: '220px' }}>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6B7280' }}>{state.display_name}</div>
          <button
            type="button"
            onClick={() => { document.documentElement.requestFullscreen?.().catch(() => {}); setShowMenu(false); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: '15px', cursor: 'pointer', borderRadius: '8px' }}
          >
            ⛶ Full screen
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Unpair this display? You will need a new code from the Dashboard.')) {
                clearDeviceToken();
                setToken(null);
                setState(null);
              }
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: '15px', cursor: 'pointer', color: '#DC2626', borderRadius: '8px' }}
          >
            Unpair this display
          </button>
        </div>
      )}

      <main className="counter-body">
        {/* QR panel */}
        <section
          key={featured ? featured.qr_token : 'checkin'}
          style={{ flex: '1.25', background: '#FFFFFF', borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderTop: `8px solid ${color}`, animation: 'counterIn .4s ease-out' }}
        >
          {featured ? (
            <>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your order · طلبك</div>
              <div style={{ fontSize: 'clamp(54px, 9vw, 96px)', fontWeight: 900, fontFamily: 'monospace', color: '#14110F', lineHeight: 1.05, margin: '4px 0 18px' }}>
                #{featured.order_number}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 'clamp(26px, 3.4vw, 38px)', fontWeight: 900, color: '#14110F', marginBottom: '18px', lineHeight: 1.2 }}>
              Get alerted when your order is ready
            </div>
          )}

          <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '20px', border: '2px solid #F3F4F6' }}>
            <QRCodeSVG value={qrValue} size={300} level="M" style={{ width: 'min(300px, 60vw)', height: 'auto', display: 'block' }} />
          </div>

          <p style={{ margin: '18px 0 4px', fontSize: 'clamp(17px, 2vw, 22px)', fontWeight: 800, color: '#14110F' }}>
            {featured ? 'Scan with your phone camera to get alerted' : 'Scan, then enter the order number on your receipt'}
          </p>
          <p style={{ margin: 0, fontSize: 'clamp(16px, 1.9vw, 21px)', fontWeight: 700, color: '#6B7280', fontFamily: 'var(--font-ar)' }} dir="rtl">
            {featured ? 'امسح الرمز بكاميرا هاتفك ليصلك تنبيه عند جهوزية طلبك' : 'امسح الرمز ثم أدخل رقم الطلب المطبوع على الفاتورة'}
          </p>
        </section>

        {/* Pickup board */}
        <section style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', flex: 1 }}>
            <OrderList title="Ready for pickup" titleAr="جاهز للاستلام" orders={ready} color="#0E7C7B" big />
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <OrderList title="Preparing" titleAr="قيد التحضير" orders={preparing} color="#B45309" />
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#9CA3AF' }}>Powered by QriousQR</footer>
    </div>
  );
}
