import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext.jsx';
import { customerMyOrders, customerActiveOrdersCount } from '../../services/orderService.js';
import { supabase, isMockMode } from '../../supabaseClient.js';
import OrderStatusPill from '../../components/OrderStatusPill.jsx';
import QSuccessToast from '../../components/QSuccessToast.jsx';

const T = {
  en: {
    title: 'My Orders',
    active: 'Active',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    emptyTitle: 'No orders yet',
    emptyDesc: 'Visit any QriousQR restaurant and show your PIN to the operator to place a walk-in order.',
    otpLabel: 'Show this OTP to the operator',
    otpSub: 'The operator will enter it to complete pickup',
    preparing: 'Preparing...',
    ready: 'Ready for pickup',
    readyToast: 'Your order #{num} at {restaurant} is ready for pickup!',
    created: 'Placed: {time}',
    preparedTime: 'Prepared: {time}',
    deliveredTime: 'Picked up: {time}',
    cancelledTime: 'Cancelled: {time}'
  },
  ar: {
    title: 'طلباتي',
    active: 'نشط',
    delivered: 'تم الاستلام',
    cancelled: 'ملغي',
    emptyTitle: 'لا توجد طلبات بعد',
    emptyDesc: 'تفضل بزيارة أي مطعم QriousQR وقم بتقديم رمز PIN الخاص بك للموظف لإنشاء طلب.',
    otpLabel: 'أظهر رمز OTP هذا للموظف',
    otpSub: 'سيقوم الموظف بإدخال الرمز لتأكيد استلام الطلب',
    preparing: 'قيد التحضير...',
    ready: 'جاهز للاستلام',
    readyToast: 'طلبك رقم #{num} في {restaurant} جاهز للاستلام!',
    created: 'تم الطلب: {time}',
    preparedTime: 'تم التحضير: {time}',
    deliveredTime: 'تم الاستلام: {time}',
    cancelledTime: 'تم الإلغاء: {time}'
  }
};

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRtl = lang === 'ar';
  const t = T[lang] || T.en;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' (pending/ready) | 'delivered' | 'cancelled'
  
  // Toast Alert
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const prevOrdersRef = useRef([]);

  const loadCustomerOrders = async () => {
    try {
      const data = await customerMyOrders();
      setOrders(data);

      // Check if any order transitioned from pending to ready
      const prevList = prevOrdersRef.current;
      if (prevList && prevList.length > 0) {
        data.forEach(order => {
          const prevOrder = prevList.find(o => o.id === order.id);
          if (prevOrder && prevOrder.status === 'pending' && order.status === 'ready') {
            // Trigger toast and browser notifications if allowed
            const restName = isRtl
              ? (order.company_name_ar || order.company_name_en || '')
              : (order.company_name_en || order.company_name_ar || '');
            const message = t.readyToast
              .replace('{num}', order.order_number)
              .replace('{restaurant}', restName);
            
            setToastMessage(message);
            setToastVisible(true);

            // Audio blip
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.3);
            } catch (e) {}

            // Native Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(restName, {
                body: `Order #${order.order_number} is ready for pickup!`,
                icon: order.company_logo_url
              });
            }
          }
        });
      }

      prevOrdersRef.current = data;
    } catch (e) {
      console.error('Error fetching customer orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerOrders();

    // Subscribe to realtime orders updates for this customer
    let channel = null;
    try {
      const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
      const customerId = session?.user?.id;
      
      if (customerId || !isMockMode) {
        channel = supabase
          .channel(`customer_orders_updates`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
              loadCustomerOrders();
            })
          .subscribe();
      }
    } catch (err) {
      console.error(err);
    }

    // Refresh on tab focus
    const handleFocus = () => {
      loadCustomerOrders();
    };
    window.addEventListener('focus', handleFocus);

    // Storage updates for mock mode sync
    const handleStorage = (e) => {
      if (e.key === 'qriousqr:mock_orders') {
        loadCustomerOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Request notification permission if not asked
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) {}
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Filter orders by active view tab
  const getFilteredOrders = () => {
    if (activeTab === 'active') {
      return orders.filter(o => o.status === 'pending' || o.status === 'ready');
    }
    return orders.filter(o => o.status === activeTab);
  };

  const filtered = getFilteredOrders();

  // Format date helper
  const formatOrderTime = (isoString) => {
    return new Date(isoString).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '24px 16px 40px 16px',
      boxSizing: 'border-box',
      direction: isRtl ? 'rtl' : 'ltr',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      textAlign: isRtl ? 'right' : 'left'
    }}>
      
      {/* Toast Alert */}
      <QSuccessToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />

      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 24px 0', color: 'var(--text)' }}>
        {t.title}
      </h2>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        gap: '8px'
      }}>
        {['active', 'delivered', 'cancelled'].map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'active' 
            ? orders.filter(o => o.status === 'pending' || o.status === 'ready').length
            : orders.filter(o => o.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid var(--primary-color, #FF5722)' : '3px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-soft)',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                paddingBottom: '8px',
                marginBottom: '-1px'
              }}
            >
              {t[tab]}
              {count > 0 && (
                <span style={{
                  backgroundColor: isActive ? 'rgba(255, 87, 34, 0.1)' : '#F3F4F6',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-soft)',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '1px 7px',
                  borderRadius: '20px'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
          {lang === 'ar' ? 'جاري تحميل الطلبات...' : 'Loading orders...'}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '2px dashed var(--border)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-soft)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛍️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
            {t.emptyTitle}
          </h3>
          <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
            {t.emptyDesc}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((order) => {
            const logo = order.company_logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop';
            const restName = isRtl
              ? (order.company_name_ar || order.company_name_en || '')
              : (order.company_name_en || order.company_name_ar || '');

            return (
              <div
                key={order.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderLeft: isRtl ? '1px solid var(--border)' : `4px solid ${order.company_primary_color || 'var(--primary-color)'}`,
                  borderRight: isRtl ? `4px solid ${order.company_primary_color || 'var(--primary-color)'}` : '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header: Logo + Name */}
                <div 
                  onClick={() => navigate(`/customer/restaurant/${order.company_slug}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  <img
                    src={logo}
                    alt=""
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                      {restName}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-soft)' }}>
                      {t.created.replace('{time}', formatOrderTime(order.created_at))}
                    </span>
                  </div>
                </div>

                {/* Main line: Order # + Status Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '4px'
                }}>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    color: 'var(--text)',
                    letterSpacing: '1px'
                  }}>
                    #{order.order_number}
                  </span>
                  
                  <OrderStatusPill status={order.status} />
                </div>

                {/* Timestamps */}
                <div style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '-4px' }}>
                  {order.status === 'ready' && order.ready_at && (
                    <span>{t.preparedTime.replace('{time}', formatOrderTime(order.ready_at))}</span>
                  )}
                  {order.status === 'delivered' && order.delivered_at && (
                    <span>{t.deliveredTime.replace('{time}', formatOrderTime(order.delivered_at))}</span>
                  )}
                  {order.status === 'cancelled' && order.cancelled_at && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{t.cancelledTime.replace('{time}', formatOrderTime(order.cancelled_at))}</span>
                      {order.cancelled_reason && (
                        <span style={{ color: '#DC2626', fontWeight: '600' }}>
                          {isRtl ? 'السبب: ' : 'Reason: '}{order.cancelled_reason}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* OTP Pickup Block */}
                {order.status === 'ready' && (
                  <div style={{
                    backgroundColor: '#E8F4FD',
                    border: '1px solid #BEE3F8',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0E7C7B' }}>
                      {t.otpLabel}
                    </span>
                    <span style={{
                      fontSize: '32px',
                      fontWeight: '900',
                      fontFamily: 'monospace',
                      color: '#0E7C7B',
                      letterSpacing: '0.2em',
                      marginLeft: isRtl ? '0' : '0.2em',
                      marginRight: isRtl ? '0.2em' : '0',
                      lineHeight: '1.2'
                    }}>
                      {order.otp}
                    </span>
                    <span style={{ fontSize: '11px', color: '#555555' }}>
                      {t.otpSub}
                    </span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
