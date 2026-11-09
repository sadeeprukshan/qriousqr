import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isMockMode } from '../../supabaseClient.js';
import {
  operatorCreateQuickOrder,
  operatorQuickOrderSetStatus,
  operatorQuickOrdersList,
} from '../../services/quickOrderService.js';
import OrderStatusPill from '../../components/OrderStatusPill.jsx';
import QSuccessToast from '../../components/QSuccessToast.jsx';

export default function QuickOrdersTab({ company, branches }) {
  const [autoNumber, setAutoNumber] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [operatorNote, setOperatorNote] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'ready' | 'delivered' | 'cancelled'
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // QR Modal state
  const [qrModalOrder, setQrModalOrder] = useState(null);

  // Confirm Delivered Modal state
  const [deliverConfirmOrder, setDeliverConfirmOrder] = useState(null);
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);

  // Cancel Modal state
  const [cancelOrderObj, setCancelOrderObj] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (branches && branches.length > 0) {
      const defaultB = branches.find((b) => b.is_default) || branches[0];
      setSelectedBranchId(defaultB.id);
    }
  }, [branches]);

  const loadOrders = async () => {
    if (!company?.id) return;
    try {
      const data = await operatorQuickOrdersList(['pending', 'ready', 'delivered', 'cancelled']);
      setOrders(data);
    } catch (err) {
      console.error('Error loading quick orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!company?.id) return;

    loadOrders();

    let channel = null;
    if (!isMockMode && supabase) {
      try {
        channel = supabase
          .channel(`quick_orders:${company.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'quick_orders', filter: `company_id=eq.${company.id}` },
            () => loadOrders()
          )
          .subscribe();
      } catch (err) {
        console.error('Realtime quick_orders subscription failed:', err);
      }
    }

    const interval = setInterval(loadOrders, 10000);

    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'qriousqr:mock_quick_orders') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [company?.id]);

  const handleCreateQuickOrder = async (e) => {
    e.preventDefault();
    setOrderError('');

    const numberToPass = autoNumber ? null : manualNumber.trim();
    if (!autoNumber && !numberToPass) {
      setOrderError('Please enter an order number or switch to Auto-number.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await operatorCreateQuickOrder(
        numberToPass,
        operatorNote.trim() || null,
        selectedBranchId || null
      );

      setManualNumber('');
      setOperatorNote('');

      const newOrd = {
        id: created.id,
        qr_token: created.qr_token,
        order_number: created.order_number,
        operator_note: operatorNote.trim() || created.operator_note || null,
        status: created.status || 'pending',
        push_subs_count: 0,
        created_at: created.created_at || new Date().toISOString(),
        branch_id: selectedBranchId || null,
      };

      setOrders((prev) => [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]);
      setQrModalOrder(newOrd);
      setToastMessage(`Quick Order #${newOrd.order_number} created`);
      setToastVisible(true);
      loadOrders();
    } catch (err) {
      console.error(err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('unique') || msg.includes('active')) {
        setOrderError('Order number already active');
      } else {
        setOrderError(err.message || 'Failed to create quick order.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async (order) => {
    try {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: 'ready', ready_at: new Date().toISOString() } : o
        )
      );
      await operatorQuickOrderSetStatus(order.id, 'ready');
      setToastMessage(`Order #${order.order_number} marked Ready — Web Push alert sent!`);
      setToastVisible(true);
      loadOrders();
    } catch (err) {
      console.error(err);
      loadOrders();
    }
  };

  const handleConfirmDelivered = async () => {
    if (!deliverConfirmOrder) return;
    setDeliverSubmitting(true);
    try {
      const target = deliverConfirmOrder;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === target.id ? { ...o, status: 'delivered', delivered_at: new Date().toISOString() } : o
        )
      );
      await operatorQuickOrderSetStatus(target.id, 'delivered');
      setToastMessage(`Order #${target.order_number} marked as Delivered`);
      setToastVisible(true);
      setDeliverConfirmOrder(null);
      loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setDeliverSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelOrderObj) return;
    setCancelSubmitting(true);
    try {
      const target = cancelOrderObj;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === target.id
            ? {
                ...o,
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_reason: cancelReason.trim() || null,
              }
            : o
        )
      );
      await operatorQuickOrderSetStatus(target.id, 'cancelled', cancelReason.trim() || null);
      setToastMessage(`Order #${target.order_number} cancelled.`);
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

  const filteredOrders = orders.filter((o) => o.status === activeSubTab);

  const getRelativeTime = (isoString) => {
    if (!isoString) return '';
    const ms = Date.now() - new Date(isoString).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const trackerUrlFor = (qrToken) =>
    typeof window !== 'undefined' ? `${window.location.origin}/track/${qrToken}` : `/track/${qrToken}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-en)' }}>
      {/* Print-scoped CSS for the QR modal */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .quick-order-qr-printable,
          .quick-order-qr-printable * {
            visibility: visible !important;
          }
          .quick-order-qr-printable {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            box-shadow: none !important;
            border: none !important;
          }
          .quick-order-no-print {
            display: none !important;
          }
        }
      `}</style>

      <QSuccessToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 1fr) 2.5fr',
          gap: '24px',
          alignItems: 'start',
        }}
        className="orders-grid-layout"
      >
        {/* Left Panel: New Quick Order */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
              New Quick Order
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(14, 124, 123, 0.1)',
                color: '#0E7C7B',
              }}
            >
              Walk-in QR
            </span>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
            No customer account or phone needed. Customer scans the QR to get a lock-screen buzz when ready.
          </p>

          <form onSubmit={handleCreateQuickOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    fontWeight: '600',
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_en}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-number vs Manual number toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                Order Numbering
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  backgroundColor: '#FAF8F5',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAutoNumber(true);
                    setOrderError('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: autoNumber ? '#FFFFFF' : 'transparent',
                    color: autoNumber ? 'var(--text)' : 'var(--text-soft)',
                    boxShadow: autoNumber ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Auto-number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoNumber(false);
                    setOrderError('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: !autoNumber ? '#FFFFFF' : 'transparent',
                    color: !autoNumber ? 'var(--text)' : 'var(--text-soft)',
                    boxShadow: !autoNumber ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  Manual number
                </button>
              </div>
            </div>

            {!autoNumber && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                  Custom Order / Table Number
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={manualNumber}
                  onChange={(e) => {
                    setManualNumber(e.target.value);
                    setOrderError('');
                  }}
                  placeholder="e.g. 42 or T12"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    outline: 'none',
                    textAlign: 'center',
                    backgroundColor: '#FAF8F5',
                  }}
                />
              </div>
            )}

            {/* Optional Note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                Note (Optional)
              </label>
              <input
                type="text"
                maxLength={120}
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                placeholder="e.g. red sedan, parked out front"
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FAF8F5',
                }}
              />
            </div>

            {orderError && (
              <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>
                ⚠️ {orderError}
              </span>
            )}

            <button
              type="submit"
              disabled={submitting || (!autoNumber && !manualNumber.trim())}
              style={{
                backgroundColor: 'var(--primary-color, #FF5722)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                opacity: submitting || (!autoNumber && !manualNumber.trim()) ? 0.6 : 1,
                marginTop: '4px',
              }}
            >
              {submitting ? 'Creating...' : 'Create & Show QR'}
            </button>
          </form>

          {company?.slug && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <a
                href={`/display/${company.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0E7C7B',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(14, 124, 123, 0.08)',
                }}
              >
                <span>📺 Open Counter Display Screen</span>
                <span>↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Panel: Active Quick Orders Board */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          }}
        >
          {/* Subtabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              marginBottom: '20px',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {['pending', 'ready', 'delivered', 'cancelled'].map((tab) => {
              const count = orders.filter((o) => o.status === tab).length;
              const isActive = activeSubTab === tab;
              const labels = {
                pending: 'Pending',
                ready: 'Ready',
                delivered: 'Delivered',
                cancelled: 'Cancelled',
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
                    marginBottom: '-1px',
                  }}
                >
                  {labels[tab]}
                  <span
                    style={{
                      backgroundColor: isActive ? 'rgba(255, 87, 34, 0.1)' : '#F3F4F6',
                      color: isActive ? 'var(--primary-color)' : 'var(--text-soft)',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
              Loading quick orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-soft)',
                border: '2px dashed var(--border)',
                borderRadius: '12px',
              }}
            >
              <h3>No {activeSubTab} quick orders</h3>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                Walk-in QR orders in this state will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order) => {
                const subsCount = Number(order.push_subs_count || 0);
                const isActiveOrder = order.status === 'pending' || order.status === 'ready';

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
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: '900',
                          fontFamily: 'monospace',
                          color: 'var(--text)',
                          backgroundColor: '#F3F4F6',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        #{order.order_number}
                      </span>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Push subs chip */}
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: subsCount > 0 ? 'rgba(14, 124, 123, 0.12)' : '#F3F4F6',
                              color: subsCount > 0 ? '#0E7C7B' : '#6B7280',
                            }}
                          >
                            {subsCount > 0 ? `📱 ${subsCount}` : '📱 not scanned yet'}
                          </span>

                          {order.operator_note && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                              {order.operator_note}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            color: 'var(--text-soft)',
                            marginTop: '4px',
                          }}
                        >
                          <span>Created {getRelativeTime(order.created_at)}</span>
                          {order.status === 'ready' && order.ready_at && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#0E7C7B', fontWeight: '600' }}>
                                Ready {getRelativeTime(order.ready_at)}
                              </span>
                            </>
                          )}
                          {order.status === 'delivered' && order.delivered_at && (
                            <>
                              <span>•</span>
                              <span>Delivered {getRelativeTime(order.delivered_at)}</span>
                            </>
                          )}
                          {order.status === 'cancelled' && order.cancelled_reason && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#DC2626' }}>Reason: {order.cancelled_reason}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <OrderStatusPill status={order.status} />

                      {/* Show QR icon button for pending/ready rows */}
                      {isActiveOrder && (
                        <button
                          type="button"
                          onClick={() => setQrModalOrder(order)}
                          title="Show QR Code"
                          style={{
                            border: '1px solid var(--border)',
                            backgroundColor: '#FAF8F5',
                            color: 'var(--text)',
                            borderRadius: '6px',
                            padding: '7px 10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect width="5" height="5" x="3" y="3" rx="1" />
                            <rect width="5" height="5" x="16" y="3" rx="1" />
                            <rect width="5" height="5" x="3" y="16" rx="1" />
                            <path d="M16 16h2v2h-2zm2 2h2v2h-2zm-2 2h2v-2" />
                          </svg>
                          <span>QR</span>
                        </button>
                      )}

                      {order.status === 'pending' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => handleMarkReady(order)}
                            style={{
                              backgroundColor: 'var(--primary-color, #FF5722)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Prepared
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelOrderObj(order)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#DC2626',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {order.status === 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setDeliverConfirmOrder(order)}
                            style={{
                              backgroundColor: '#0E7C7B',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Delivered
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelOrderObj(order)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#DC2626',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0,
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

      {/* QR Code Modal */}
      {qrModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setQrModalOrder(null)}
        >
          <div
            className="quick-order-qr-printable"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px 28px',
              width: '100%',
              maxWidth: '420px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <button
              type="button"
              className="quick-order-no-print"
              onClick={() => setQrModalOrder(null)}
              aria-label="Close QR Modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid var(--border)',
                backgroundColor: '#FAF8F5',
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>

            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {company?.name_en || 'Order Tracker'}
            </div>

            <div
              style={{
                fontSize: '42px',
                fontWeight: '900',
                fontFamily: 'monospace',
                color: 'var(--text)',
                margin: '6px 0 16px 0',
                letterSpacing: '0.04em',
              }}
            >
              #{qrModalOrder.order_number}
            </div>

            {qrModalOrder.operator_note && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-soft)',
                  marginBottom: '16px',
                  fontWeight: '600',
                }}
              >
                {qrModalOrder.operator_note}
              </div>
            )}

            <div
              style={{
                display: 'inline-flex',
                padding: '18px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #F3F4F6',
                borderRadius: '16px',
                marginBottom: '18px',
              }}
            >
              <QRCodeSVG
                value={trackerUrlFor(qrModalOrder.qr_token)}
                size={280}
                level="M"
                includeMargin={false}
              />
            </div>

            <p
              style={{
                margin: '0 0 22px 0',
                fontSize: '13px',
                color: 'var(--text-soft)',
                lineHeight: 1.5,
              }}
            >
              Scan with your phone camera to track your order. Tap <strong>&lsquo;Enable Alerts&rsquo;</strong> once and your phone will buzz when it&apos;s ready.
            </p>

            <div className="quick-order-no-print" style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FAF8F5',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🖨️ Print
              </button>
              <button
                type="button"
                onClick={() => setQrModalOrder(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--primary-color, #FF5722)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Confirmation Modal (no OTP needed for walk-in quick orders) */}
      {deliverConfirmOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
              Mark Order #{deliverConfirmOrder.order_number} Delivered?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
              Confirm that the customer has picked up Order <strong>#{deliverConfirmOrder.order_number}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeliverConfirmOrder(null)}
                disabled={deliverSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivered}
                disabled={deliverSubmitting}
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
                  opacity: deliverSubmitting ? 0.6 : 1,
                }}
              >
                {deliverSubmitting ? 'Saving...' : 'Confirm Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelOrderObj && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
              Cancel Quick Order #{cancelOrderObj.order_number}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-soft)' }}>
              Are you sure you want to cancel this order?
            </p>
            <form onSubmit={handleCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)' }}>
                  Reason (Optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Out of stock, customer left..."
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    height: '80px',
                    resize: 'none',
                    outline: 'none',
                    backgroundColor: '#FAF8F5',
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
                    cursor: 'pointer',
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
                    cursor: 'pointer',
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
