import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CustomerNavIsland from '../components/CustomerNavIsland.jsx';

export default function CustomerLayout() {
  const { user, isCustomer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>Loading session...</h3>
      </div>
    );
  }

  // Auth Guard
  if (!user || !isCustomer) {
    const searchParams = new URLSearchParams(location.search);
    const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
    return <Navigate to={`/customer/login?lang=${lang}`} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, paddingBottom: '96px', boxSizing: 'border-box' }}>
        <Outlet />
      </main>
      <CustomerNavIsland />
    </div>
  );
}
