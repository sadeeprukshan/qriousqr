import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ChangePasswordForm from '../../components/ChangePasswordForm.jsx';
import { supabase } from '../../supabaseClient.js';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminToast, setAdminToast] = useState({ show: false, message: '', link: '' });

  const showAdminToast = (message) => {
    setAdminToast({ show: true, message, link: '/admin/messages' });
    // Clear toast after 6 seconds
    setTimeout(() => {
      setAdminToast(prev => {
        if (prev.message === message) {
          return { show: false, message: '', link: '' };
        }
        return prev;
      });
    }, 6000);
  };

  // Fetch initial unread count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const { data, error } = await supabase.rpc('contact_messages_unread_count');
        if (error) throw error;
        setUnreadCount(data ?? 0);
      } catch (err) {
        console.error('Error fetching unread messages count:', err);
      }
    }
    fetchUnreadCount();
  }, []);

  // Subscribe to realtime contact_messages changes
  useEffect(() => {
    const channel = supabase
      .channel('admin_contact_messages_layout')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        async (payload) => {
          // Re-fetch unread count on any change to stay synced
          try {
            const { data, error } = await supabase.rpc('contact_messages_unread_count');
            if (!error) {
              setUnreadCount(data ?? 0);
            }
          } catch (err) {
            console.error(err);
          }

          // Trigger toast on new inserts
          if (payload.eventType === 'INSERT') {
            showAdminToast(`New quote request from ${payload.new.name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!changePasswordModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setChangePasswordModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changePasswordModalOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Companies';
    if (path.startsWith('/admin/companies/')) return 'Companies / Details';
    if (path === '/admin/users') return 'Users';
    if (path === '/admin/messages') return 'Messages';
    if (path === '/admin/customers') return 'Customers';
    if (path === '/admin/claims') return 'Claims';
    if (path === '/admin/reports') return 'Reports';
    return 'Admin';
  };

  return (
    <div className="admin-shell" style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      fontFamily: 'var(--font-en)',
      backgroundColor: '#FAF8F5'
    }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{
        width: '260px',
        backgroundColor: '#1E1B18',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 100,
        transition: 'transform 0.3s ease'
      }}>
        {/* Brand Row */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--primary-color)' }}>QRious Admin</h2>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#FF3B30',
            display: 'inline-block'
          }} />
        </div>

        {/* Current Admin User Card */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#e4e2e0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {user?.email || 'admin@qrious.com'}
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--primary-color)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Super Admin
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin' || location.pathname.startsWith('/admin/companies') ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Companies
          </Link>

          <Link
            to="/admin/users"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin/users' ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Users
          </Link>

          <Link
            to="/admin/messages"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin/messages' ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Messages
            </div>
            {unreadCount > 0 && (
              <span style={{
                backgroundColor: 'var(--primary-color)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '999px',
                lineHeight: 1
              }}>
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/admin/customers"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin/customers' ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Customers
          </Link>

          <Link
            to="/admin/claims"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin/claims' ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="13" x="3" y="6" rx="2" />
              <path d="M12 6v13" strokeDasharray="3 3" />
            </svg>
            Claims
          </Link>

          <Link
            to="/admin/reports"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: location.pathname === '/admin/reports' ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            Reports
          </Link>
        </nav>

        {/* Sign Out Button */}
        <div style={{ padding: '24px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setChangePasswordModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#a09e9c',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s, color 0.2s',
              marginBottom: '8px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#a09e9c'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Change password
          </button>

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              color: '#FF6B6B',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              textAlign: 'left',
              transition: 'background 0.2s'
            }}
          >
            <svg style={{ marginRight: '12px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Top Header Bar */}
        <header style={{
          height: '60px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0
        }}>
          {/* Mobile menu toggle */}
          <button
            className="admin-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              padding: '8px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>

          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-soft)'
          }}>
            {getBreadcrumbs()}
          </div>
        </header>

        {/* Content Body */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 24px',
          boxSizing: 'border-box'
        }}>
          <Outlet />
        </main>
      </div>

      {changePasswordModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setChangePasswordModalOpen(false)}
        >
          <div 
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxSizing: 'border-box',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>Change password</h3>
              <button 
                onClick={() => setChangePasswordModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-soft)',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <ChangePasswordForm lang="en" onSuccess={() => setChangePasswordModalOpen(false)} />
          </div>
        </div>
      )}
      {/* Realtime Toast Notification */}
      {adminToast.show && (
        <div 
          onClick={() => {
            setAdminToast({ show: false, message: '', link: '' });
            navigate(adminToast.link);
          }}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#1E1B18',
            color: '#FFFFFF',
            borderLeft: '4px solid #FF5722',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            zIndex: 11000,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'admin-toast-slide-in 0.25s ease-out'
          }}
        >
          <span style={{ fontSize: '20px' }}>📬</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>New Message</div>
            <div style={{ fontSize: '12px', color: '#e4e2e0', marginTop: '2px' }}>{adminToast.message}</div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setAdminToast({ show: false, message: '', link: '' });
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a09e9c',
              fontSize: '18px',
              cursor: 'pointer',
              marginLeft: '12px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
