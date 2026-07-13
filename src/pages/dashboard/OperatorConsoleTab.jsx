import React, { useState, useEffect, useRef } from 'react';
import { supabase, isMockMode } from '../../supabaseClient.js';
import { pendingClaimsForCompany, claimStep2 } from '../../services/couponService.js';
import { translateCategory } from '../../lib/couponCategories.js';

// Audio blip generator
const playPing = () => {
  const soundOn = sessionStorage.getItem('qriousqr:sound_notification') !== 'off';
  if (!soundOn) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 700; // Hz
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

// Countdown Timer Hook
function useCountdown(expiresAt, onExpire) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('00:00');
        onExpire();
        return;
      }
      const totalSecs = Math.floor(ms / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  return timeLeft;
}

// Single Claim Card component
function ClaimCard({ claim, onAuthorized, onRejected }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [rejected, setRejected] = useState(false);

  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);

  // Time expiry
  const timeLeft = useCountdown(claim.expires_at, () => {
    onRejected(claim.id);
  });

  const handleP1Change = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setP1(val);
    if (val.length === 3) {
      ref2.current?.focus();
    }
  };

  const handleP2Change = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setP2(val);
    if (val.length === 3) {
      ref3.current?.focus();
    } else if (val.length === 0) {
      ref1.current?.focus();
    }
  };

  const handleP3Change = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setP3(val);
    if (val.length === 0) {
      ref2.current?.focus();
    }
  };

  // Clipboard Paste Support
  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 9);
    if (data.length >= 1) {
      const part1 = data.slice(0, 3);
      const part2 = data.slice(3, 6);
      const part3 = data.slice(6, 9);
      setP1(part1);
      setP2(part2);
      setP3(part3);
      if (part3.length > 0) {
        ref3.current?.focus();
      } else if (part2.length > 0) {
        ref2.current?.focus();
      } else {
        ref1.current?.focus();
      }
    }
  };

  const handleAuth = async () => {
    const pin = `${p1}${p2}${p3}`;
    if (pin.length !== 9) {
      setError('Please enter all 9 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setShaking(false);

    try {
      await claimStep2(claim.id, pin);
      setAuthorized(true);
      setTimeout(() => {
        onAuthorized(claim.id);
      }, 1200);
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('wrong_customer_pin')) {
        setShaking(true);
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= 3) {
          setRejected(true);
          setError('Wrong PIN. Claim auto-rejected after 3 attempts.');
          setTimeout(() => {
            onRejected(claim.id);
          }, 2000);
        } else {
          setError(`Wrong PIN. Attempt ${nextAttempts}/3`);
        }
      } else if (msg.includes('too_many_attempts')) {
        setRejected(true);
        setError('Wrong PIN. Claim auto-rejected.');
        setTimeout(() => {
          onRejected(claim.id);
        }, 2000);
      } else {
        setError('Authorization failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const nameInitials = `${claim.customer_first_name?.[0] || ''}${claim.customer_last_name?.[0] || ''}`.toUpperCase();
  const customerName = `${claim.customer_first_name || ''} ${claim.customer_last_name || ''}`;

  return (
    <div style={{
      background: authorized ? '#DCFCE7' : (rejected ? '#FEE2E2' : '#FFFFFF'),
      border: `1px solid ${authorized ? '#BBF7D0' : (rejected ? '#FCA5A5' : 'var(--border)')}`,
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      flexWrap: 'wrap',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'all 0.3s ease',
      animation: shaking ? 'shake 0.4s ease-in-out' : 'none'
    }}>
      {/* Left: customer details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#FF5722',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}>
          {nameInitials}
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
            {customerName}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>wants to redeem</span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--primary-color)',
              backgroundColor: 'rgba(255, 87, 34, 0.08)',
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              {claim.category?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: 3-part PIN input with placeholder dots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onPaste={handlePaste}>
          <input
            ref={ref1}
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={3}
            value={p1}
            onChange={handleP1Change}
            placeholder="•••"
            disabled={loading || authorized || rejected}
            style={{
              width: '54px',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '16px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontWeight: '700',
              outline: 'none'
            }}
          />
          <span style={{ color: 'var(--text-soft)' }}>-</span>
          <input
            ref={ref2}
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={3}
            value={p2}
            onChange={handleP2Change}
            placeholder="•••"
            disabled={loading || authorized || rejected}
            style={{
              width: '54px',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '16px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontWeight: '700',
              outline: 'none'
            }}
          />
          <span style={{ color: 'var(--text-soft)' }}>-</span>
          <input
            ref={ref3}
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={3}
            value={p3}
            onChange={handleP3Change}
            placeholder="•••"
            disabled={loading || authorized || rejected}
            style={{
              width: '54px',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '16px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontWeight: '700',
              outline: 'none'
            }}
          />
        </div>
        {error && (
          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600' }}>{error}</span>
        )}
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#EA580C' }}>
            Expires: {timeLeft}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onRejected(claim.id)}
            disabled={loading || authorized || rejected}
            style={{
              padding: '8px 16px',
              border: '1px solid #FCA5A5',
              backgroundColor: 'transparent',
              color: '#DC2626',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reject
          </button>
          <button
            onClick={handleAuth}
            disabled={loading || authorized || rejected || `${p1}${p2}${p3}`.length !== 9}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'var(--primary-color)',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              opacity: (`${p1}${p2}${p3}`.length !== 9 || loading || authorized || rejected) ? 0.6 : 1
            }}
          >
            {loading ? '...' : 'Authorize'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OperatorConsoleTab({ company }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyClaims, setHistoryClaims] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(sessionStorage.getItem('qriousqr:sound_notification') !== 'off');
  
  const prevClaimsIdsRef = useRef([]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sessionStorage.setItem('qriousqr:sound_notification', next ? 'on' : 'off');
  };

  const loadClaims = async () => {
    if (!company?.id) return;
    try {
      const data = await pendingClaimsForCompany(company.id);
      
      // Check if new claims arrived to play sound
      const currentIds = data.map(c => c.id);
      const prevIds = prevClaimsIdsRef.current;
      const newlyAdded = currentIds.filter(id => !prevIds.includes(id));
      
      if (newlyAdded.length > 0 && prevIds.length > 0) {
        playPing();
      }
      
      prevClaimsIdsRef.current = currentIds;
      setClaims(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!company?.id) return;
    try {
      if (isMockMode) {
        const allClaims = JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
        const completed = allClaims
          .filter(c => c.company_slug === company.slug && c.status === 'authorized')
          .map(c => ({
            claim_id: c.id,
            completed_at: c.authorized_at || c.created_at,
            category: c.category,
            year: 2026,
            customer_id: c.customer_id,
            customer_name: `${c.customer_first_name || 'Demo'} ${c.customer_last_name || 'Diner'}`,
            customer_phone: '+96171234567',
            customer_email: c.customer_email || 'diner@qriousqr.local'
          }));
        setHistoryClaims(completed);
      } else {
        const { data, error } = await supabase.rpc('tenant_claimed_coupons', {
          p_company_id: company.id,
          p_days: 90
        });
        if (!error && data) {
          setHistoryClaims(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
    loadHistory();

    // Subscribe to realtime postgres events
    const ch = supabase
      .channel(`claims:${company.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'coupon_claims', filter: `company_id=eq.${company.id}` },
        (payload) => {
          loadClaims();
          loadHistory();
        })
      .subscribe();

    // Fallback polling (20 seconds)
    const interval = setInterval(() => {
      loadClaims();
      loadHistory();
    }, 20000);

    // Storage event for mock mode tab-to-tab sync
    const handleStorageChange = () => {
      loadClaims();
      loadHistory();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [company?.id]);

  const handleAuthorized = (claimId) => {
    setClaims(prev => prev.filter(c => c.id !== claimId));
    loadHistory();
  };

  const handleRejected = (claimId) => {
    // For mock mode reject, mark as rejected in localStorage
    if (isMockMode) {
      try {
        const mockClaims = JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
        const c = mockClaims.find(x => x.id === claimId);
        if (c) {
          c.status = 'rejected';
          localStorage.setItem('qriousqr:mock_claims', JSON.stringify(mockClaims));
          window.dispatchEvent(new Event('storage'));
        }
      } catch {}
    }
    setClaims(prev => prev.filter(c => c.id !== claimId));
    loadHistory();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Console Header Banner */}
      <div style={{
        background: '#FAF8F5',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
            Operator console
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-soft)' }}>
            Diner-initiated coupon claims appear here in real time.
          </p>
        </div>

        {/* Sound controls */}
        <button
          onClick={toggleSound}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            backgroundColor: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{soundOn ? '🔊 Sound On' : '🔇 Sound Off'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
          Loading pending claims...
        </div>
      ) : claims.length === 0 ? (
        /* Empty State */
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: '16px',
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-soft)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            position: 'relative',
            width: '12px',
            height: '12px'
          }}>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes pulseDot {
                0% { transform: scale(0.9); opacity: 0.8; }
                50% { transform: scale(1.6); opacity: 0.4; }
                100% { transform: scale(0.9); opacity: 0.8; }
              }
              .pulse-circle {
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                background-color: #22C55E;
                animation: pulseDot 2s infinite;
              }
            `}} />
            <div className="pulse-circle" />
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: '#22C55E'
            }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '700', marginTop: '6px' }}>
            Waiting for the next claim…
          </span>
        </div>
      ) : (
        /* Claims list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {claims.map(claim => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onAuthorized={handleAuthorized}
              onRejected={handleRejected}
            />
          ))}
        </div>
      )}

      {/* Claim History Section */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
          Claim History — last 90 days
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-soft)' }}>
          Latest authorized coupon claims for your store.
        </p>

        {historyLoading ? (
          <div style={{ padding: '24px 0', color: 'var(--text-soft)', fontSize: '13px' }}>
            Loading history logs...
          </div>
        ) : historyClaims.length === 0 ? (
          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: '12px',
            padding: '30px 16px',
            textAlign: 'center',
            color: 'var(--text-soft)',
            fontSize: '13px'
          }}>
            No coupons have been claimed here yet.
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--border)', color: 'var(--text-soft)', fontWeight: '700' }}>
                  <th style={{ padding: '10px 16px' }}>When</th>
                  <th style={{ padding: '10px 16px' }}>Category</th>
                  <th style={{ padding: '10px 16px' }}>Customer</th>
                  <th style={{ padding: '10px 16px' }}>Phone</th>
                  <th style={{ padding: '10px 16px' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {historyClaims.map((claim) => {
                  const dateStr = new Date(claim.completed_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <tr key={claim.claim_id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                        {translateCategory(claim.category, 'en')}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                        {claim.customer_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {claim.customer_phone ? (
                          <a href={`tel:${claim.customer_phone}`} style={{ color: 'var(--primary-color, #FF5722)', textDecoration: 'none', fontWeight: '600' }}>
                            {claim.customer_phone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-soft)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {claim.customer_email ? (
                          <a href={`mailto:${claim.customer_email}`} style={{ color: 'var(--text-soft)', textDecoration: 'underline' }}>
                            {claim.customer_email}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-soft)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {historyClaims.length >= 100 && (
              <div style={{ padding: '10px 16px', background: '#FAF8F5', color: 'var(--text-soft)', fontSize: '11px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                Showing latest 100. Older claims not yet browseable.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
