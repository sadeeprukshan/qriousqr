import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Companies';
    if (path.startsWith('/admin/companies/')) return 'Companies / Details';
    if (path === '/admin/users') return 'Users';
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
    </div>
  );
}
