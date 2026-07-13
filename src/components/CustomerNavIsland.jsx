import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function HomeIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TicketIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <rect width="18" height="13" x="3" y="6" rx="2" />
      <path d="M12 6v13" strokeDasharray="3 3" />
    </svg>
  );
}

function UserIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function CustomerNavIsland() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Detect language from search params or localStorage
  const searchParams = new URLSearchParams(location.search);
  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';

  const pathname = location.pathname;
  let activeTab = 'home';
  if (pathname.startsWith('/customer/claims')) {
    activeTab = 'coupons';
  } else if (pathname.startsWith('/customer/profile')) {
    activeTab = 'profile';
  }

  const handleNav = (route) => {
    // Preserve language param
    navigate(`${route}?lang=${lang}`);
  };

  const navItems = [
    {
      key: 'home',
      label: isRtl ? 'الرئيسية' : 'Home',
      route: '/customer',
      icon: (filled) => <HomeIcon filled={filled} />
    },
    {
      key: 'coupons',
      label: isRtl ? 'قسائمي' : 'Coupons',
      route: '/customer/claims',
      icon: (filled) => <TicketIcon filled={filled} />
    },
    {
      key: 'profile',
      label: isRtl ? 'حسابي' : 'Profile',
      route: '/customer/profile',
      icon: (filled) => <UserIcon filled={filled} />
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(18px) saturate(160%)',
      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
      borderRadius: '999px',
      height: '56px',
      padding: '4px 8px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      zIndex: 900,
      width: '280px',
      border: '1px solid rgba(255, 255, 255, 0.7)'
    }}>
      {navItems.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => handleNav(item.route)}
            style={{
              flex: 1,
              height: '100%',
              background: 'none',
              border: 'none',
              color: '#111',
              opacity: isActive ? 1 : 0.75,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              gap: '3px',
              position: 'relative',
              transition: 'opacity 0.2s',
              fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)'
            }}
          >
            {item.icon(isActive)}
            <span style={{ fontSize: '10px', fontWeight: isActive ? '600' : '500', letterSpacing: isRtl ? '0' : '0.2px' }}>
              {item.label}
            </span>
            {isActive && (
              <span style={{
                position: 'absolute',
                bottom: '1px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: '#111'
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
