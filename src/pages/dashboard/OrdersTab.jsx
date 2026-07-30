import React, { useState, useEffect, useRef } from 'react';
import { supabase, isMockMode } from '../../supabaseClient.js';
import {
  operatorCreateOrder,
  operatorOrdersList,
  operatorMarkReady,
  operatorMarkDelivered,
  operatorCancelOrder
} from '../../services/orderService.js';
import OrderStatusPill from '../../components/OrderStatusPill.jsx';
import QSuccessToast from '../../components/QSuccessToast.jsx';

// Audio ping generator for new orders
const playPing = () => {
  const soundOn = sessionStorage.getItem('qriousqr:sound_notification') !== 'off';
  if (!soundOn) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 650; // Hz
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

export default function OrdersTab({ company, branches }) {
  const [pin, setPin] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'ready' | 'delivered' | 'cancelled'
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  
  // OTP Modal
  const [otpOrder, setOtpOrder] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Cancel Modal
  const [cancelOrderObj, setCancelOrderObj] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const prevOrdersIdsRef = useRef([]);

  // Set default branch
  useEffect(() => {
    if (branches && branches.length > 0) {
      const defaultB = branches.find(b => b.is_default) || branches[0];
      setSelectedBranchId(defaultB.id);
    }
  }, [branches]);

  // Load orders list
  const loadOrders = async () => {
    if (!company?.id) return;
    try {
      const data = await operatorOrdersList();
      setOrders(data);

      // Play alert ping if new orders arrived
      const currentIds = data.map(o => o.id);
      const prevIds = prevOrdersIdsRef.current;
      const newlyAdded = currentIds.filter(id => !prevIds.includes(id));
      
      // If there are new pending orders that weren't in previous snapshot, play ping
      if (newlyAdded.length > 0 && prevIds.length > 0) {
        const hasNewPending = newlyAdded.some(id => {
          const ord = data.find(x => x.id === id);
          return ord && ord.status === 'pending';
        });
        if (hasNewPending) {
          playPing();
        }
      }
      prevOrdersIdsRef.current = currentIds;
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!company?.id) return;
    
    loadOrders();

    // Subscribe to realtime updates on orders table
    let channel = null;
    try {
      channel = supabase
        .channel(`orders:${company.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${company.id}` },
          (payload) => {
            loadOrders();
          })
        .subscribe();
    } catch (err) {
      console.error('Realtime orders subscription failed:', err);
    }

    // Polling fallback
    const interval = setInterval(loadOrders, 10000);

    // Sync on local storage edits in mock mode
    const handleStorageChange = (e) => {
      if (e.key === 'qriousqr:mock_orders') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) {}
      }
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [company?.id]);

  // Create order submit
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length !== 9) {
      setOrderError('PIN must be exactly 9 digits.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError('');

    try {
      const result = await operatorCreateOrder(cleanPin, selectedBranchId || null);
      setPin('');
      
      // Optimistic prepend
      const newOrd = {
        id: result.id,
        order_number: result.order_number,
        status: 'pending',
        customer_first_name: result.customer_first_name,
        customer_last_name: result.customer_last_name,
        created_at: result.created_at || new Date().toISOString(),
        branch_id: selectedBranchId
      };
      setOrders(prev => [newOrd, ...prev]);

      setToastMessage(`Order #${result.order_number} created for ${result.customer_first_name} ${result.customer_last_name}`);
      setToastVisible(true);
      loadOrders();
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('customer_not_found')) {
        setOrderError('No customer found with that PIN.');
      } else if (msg.includes('not_an_operator')) {
        setOrderError('You are not linked to any restaurant.');
      } else {
        setOrderError('Failed to create order. Please try again.');
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Mark order ready
  const handleMarkReady = async (orderId, orderNum) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready', ready_at: new Date().toISOString() } : o));
      
      await operatorMarkReady(orderId);
      setToastMessage(`Order #${orderNum} marked as Prepared & Ready`);
      setToastVisible(true);
      loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Verify OTP and deliver
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpValue || otpValue.trim().length !== 6) {
      setOtpError('OTP must be 6 digits.');
      return;
    }

    setOtpSubmitting(true);
    setOtpError('');

    try {
      await operatorMarkDelivered(otpOrder.id, otpValue.trim());
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === otpOrder.id ? { ...o, status: 'delivered', delivered_at: new Date().toISOString() } : o));
      
      setToastMessage(`Order #${otpOrder.order_number} successfully delivered!`);
      setToastVisible(true);
      setOtpOrder(null);
      setOtpValue('');
      loadOrders();
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('wrong_otp')) {
        setOtpError('Incorrect OTP code. Please try again.');
      } else {
        setOtpError('Failed to verify OTP. Please try again.');
      }
    } finally {
      setOtpSubmitting(false);
    }
  };

  // Cancel order submit
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setCancelSubmitting(true);
    try {
      await operatorCancelOrder(cancelOrderObj.id, cancelReason || null);
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === cancelOrderObj.id ? { ...o, status: 'cancelled', cancelled_at: new Date().toISOString() } : o));
      
      setToastMessage(`Order #${cancelOrderObj.order_number} cancelled.`);
      setToastVisible(true);
      setCancelOrderObj(null);
      setCancelReason('');
      loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Filter orders by active subtab
  const filteredOrders = orders.filter(o => o.status === activeSubTab);

  // Time format helper
  const getRelativeTime = (isoString) => {
    const ms = Date.now() - new Date(isoString).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-en)' }}>
      
      {/* Toast Alert */}
      <QSuccessToast 
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) 2.5fr',
        gap: '24px',
        alignItems: 'start'
      }} className="orders-grid-layout">
        
        {/* Left Form: Create New Order */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
            New Pickup Order
          </h3>

          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Branch dropdown if multiple */}
            {branches && branches.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                  Assigned Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    backgroundColor: '#FAF8F5',
                    color: 'var(--text)',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name_en}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer PIN input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                Customer PIN (9 Digits)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={9}
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="234567000"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '16px',
                  letterSpacing: '0.1em',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  outline: 'none',
                  textAlign: 'center',
                  backgroundColor: '#FAF8F5'
                }}
              />
              {orderError && (
                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600', marginTop: '2px' }}>
                  ⚠️ {orderError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingOrder || pin.length !== 9}
              style={{
                backgroundColor: 'var(--primary-color, #FF5722)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: (pin.length !== 9 || submittingOrder) ? 0.6 : 1,
                marginTop: '8px'
              }}
            >
              {submittingOrder ? 'Creating Order...' : 'Create Order'}
            </button>
          </form>
        </div>

        {/* Right Panel: Orders Management Board */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
        }}>
          {/* Subtabs headers */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px',
            gap: '8px'
          }}>
            {['pending', 'ready', 'delivered', 'cancelled'].map((tab) => {
              const count = orders.filter(o => o.status === tab).length;
              const isActive = activeSubTab === tab;
              const labels = {
                pending: 'Pending',
                ready: 'Ready',
                delivered: 'Delivered',
                cancelled: 'Cancelled'
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    borderBottom: isActive ? '3px solid var(--primary-color, #FF5722)' : '3px solid transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-soft)',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingBottom: '8px',
                    marginBottom: '-1px'
                  }}
                >
                  {labels[tab]}
                  <span style={{
                    backgroundColor: isActive ? 'rgba(255, 87, 34, 0.1)' : '#F3F4F6',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-soft)',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '20px'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-soft)',
              border: '2px dashed var(--border)',
              borderRadius: '12px'
            }}>
              <h3>No {activeSubTab} orders</h3>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                Pickup orders in this state will display here.
              </p>
            </div>
          ) : (
            /* Orders List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order) => {
                const customerName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim() || 'Walk-in Diner';
                
                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        color: 'var(--text)',
                        backgroundColor: '#F3F4F6',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        #{order.order_number}
                      </span>
                      
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                          {customerName}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-soft)' }}>
                          <span>Created {getRelativeTime(order.created_at)}</span>
                          {order.status === 'ready' && order.ready_at && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#0E7C7B', fontWeight: '600' }}>Ready {getRelativeTime(order.ready_at)}</span>
                            </>
                          )}
                          {order.status === 'delivered' && order.delivered_at && (
                            <>
                              <span>•</span>
                              <span>Delivered {getRelativeTime(order.delivered_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <OrderStatusPill status={order.status} />

                      {/* Actions */}
                      {order.status === 'pending' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={() => handleMarkReady(order.id, order.order_number)}
                            style={{
                              backgroundColor: 'var(--primary-color, #FF5722)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Prepared
                          </button>
                          <button
                            onClick={() => setCancelOrderObj(order)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#DC2626',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {order.status === 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={() => {
                              setOtpOrder(order);
                              setOtpValue('');
                              setOtpError('');
                            }}
                            style={{
                              backgroundColor: '#0E7C7B',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Enter OTP →
                          </button>
                          <button
                            onClick={() => setCancelOrderObj(order)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#DC2626',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* OTP verification Modal */}
      {otpOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
              Complete Order Pickup
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-soft)', lineHeight: '1.5' }}>
              Ask customer for the 6-digit OTP shown on their screen for Order <strong>#{otpOrder.order_number}</strong>.
            </p>

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  autoComplete="off"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '24px',
                    letterSpacing: '0.3em',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    textAlign: 'center',
                    outline: 'none',
                    backgroundColor: '#FAF8F5'
                  }}
                />
                {otpError && (
                  <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600', textAlign: 'center', marginTop: '2px' }}>
                    {otpError}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setOtpOrder(null)}
                  disabled={otpSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={otpSubmitting || otpValue.length !== 6}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0E7C7B',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    opacity: (otpValue.length !== 6 || otpSubmitting) ? 0.6 : 1
                  }}
                >
                  {otpSubmitting ? 'Verifying...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel confirm Modal */}
      {cancelOrderObj && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
              Cancel Order #{cancelOrderObj.order_number}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-soft)' }}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>

            <form onSubmit={handleCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                  Reason (Optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Out of stock, customer requested cancellation..."
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    height: '80px',
                    resize: 'none',
                    outline: 'none',
                    backgroundColor: '#FAF8F5'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCancelOrderObj(null)}
                  disabled={cancelSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
