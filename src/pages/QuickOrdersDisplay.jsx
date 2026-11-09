import React, { useState, useEffect, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isMockMode } from '../supabaseClient.js';
import { operatorQuickOrdersList } from '../services/quickOrderService.js';
import OrderStatusPill from '../components/OrderStatusPill.jsx';

// TEMPORARY until public `display_quick_orders(p_slug)` RPC lands:
// Gate `/display/:slug` behind operator login and reuse `operator_quick_orders_list`.
// TODO: When `display_quick_orders(p_slug)` anon RPC is deployed, allow unauthenticated counter tablets.
export default function QuickOrdersDisplay() {
  const { slug } = useParams();
  const { user, loading: authLoading, currentCompany } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [glowingIds, setGlowingIds] = useState({});
  const [hiddenReadyIds, setHiddenReadyIds] = useState({});
  const prevStatusMapRef = useRef({});
  const timersRef = useRef([]);

  const loadDisplayOrders = async () => {
    try {
      const list = await operatorQuickOrdersList(['pending', 'ready']);
      const prevMap = prevStatusMapRef.current;

      list.forEach((order) => {
        const prevStatus = prevMap[order.id];
        if (prevStatus && prevStatus !== 'ready' && order.status === 'ready') {
          // Order just flipped to Ready -> glow teal for 10s, auto-remove 30s later
          setGlowingIds((prev) => ({ ...prev, [order.id]: true }));
          const tGlow = setTimeout(() => {
            setGlowingIds((prev) => {
              const copy = { ...prev };
              delete copy[order.id];
              return copy;
            });
          }, 10000);

          const tHide = setTimeout(() => {
            setHiddenReadyIds((prev) => ({ ...prev, [order.id]: true }));
          }, 40000); // 10s glow + 30s later

          timersRef.current.push(tGlow, tHide);
        }
        prevMap[order.id] = order.status;
      });

      setOrders(list);
    } catch (err) {
      console.error('Error loading display quick orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadDisplayOrders();

    let channel = null;
    if (!isMockMode && supabase) {
      try {
        const filter = currentCompany?.id ? `company_id=eq.${currentCompany.id}` : undefined;
        channel = supabase
          .channel(`display_quick_orders:${slug}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'quick_orders', ...(filter ? { filter } : {}) },
            () => loadDisplayOrders()
          )
          .subscribe();
      } catch (err) {
        console.error('Display realtime error:', err);
      }
    }

    const interval = setInterval(loadDisplayOrders, 8000);

    const handleStorage = (e) => {
      if (!e.key || e.key === 'qriousqr:mock_quick_orders') {
        loadDisplayOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      timersRef.current.forEach(clearTimeout);
    };
  }, [user, currentCompany?.id, slug]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>Loading counter display...</h3>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const visibleOrders = orders.filter(
    (o) => (o.status === 'pending' || o.status === 'ready') && !hiddenReadyIds[o.id]
  );

  const trackerUrlFor = (qrToken) =>
    typeof window !== 'undefined' ? `${window.location.origin}/track/${qrToken}` : `/track/${qrToken}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#14110F',
        color: '#FFFFFF',
        fontFamily: 'var(--font-en)',
        padding: '28px 32px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes quickTileSlideIn {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes readyTealGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(14, 124, 123, 0.7), 0 0 32px rgba(14, 124, 123, 0.85);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(14, 124, 123, 0), 0 0 48px rgba(20, 184, 166, 1);
          }
        }
      `}</style>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          paddingBottom: '18px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {currentCompany?.logo_url && (
            <img
              src={currentCompany.logo_url}
              alt=""
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em' }}>
              {currentCompany?.name_en || slug} — Order Pickup Board
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              Scan your order&apos;s QR code with your phone camera to get alerted when it&apos;s ready
            </p>
          </div>
        </div>

        <Link
          to="/dashboard"
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '13px',
            fontWeight: '700',
            textDecoration: 'none',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          ← Back to Dashboard
        </Link>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.6)' }}>
          Loading active orders...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '100px 20px',
            border: '2px dashed rgba(255,255,255,0.15)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#FFFFFF' }}>
            No active walk-in orders right now
          </h2>
          <p style={{ margin: 0, fontSize: '14px' }}>
            New quick orders created from the operator dashboard will appear here automatically.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '24px',
          }}
        >
          {visibleOrders.map((order) => {
            const isReady = order.status === 'ready';
            const isGlowing = !!glowingIds[order.id];

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: isReady ? '#0E7C7B' : '#FFFFFF',
                  color: isReady ? '#FFFFFF' : '#14110F',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '14px',
                  animation: isGlowing
                    ? 'readyTealGlow 1.5s infinite ease-in-out'
                    : 'quickTileSlideIn 0.35s ease-out',
                  border: isReady ? '3px solid #2DD4BF' : '3px solid transparent',
                  transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
                }}
              >
                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    lineHeight: 1.1,
                  }}
                >
                  #{order.order_number}
                </div>

                <OrderStatusPill status={order.status} />

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px',
                    borderRadius: '14px',
                    display: 'inline-flex',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <QRCodeSVG
                    value={trackerUrlFor(order.qr_token)}
                    size={175}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    opacity: isReady ? 0.95 : 0.65,
                  }}
                >
                  {isReady ? '🎉 Ready for pickup at counter!' : 'Scan to get lock-screen alert'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
