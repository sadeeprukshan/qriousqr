import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { loadCompanyBranches } from './services/dataService.js';
import PublicMenu from './pages/PublicMenu.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import InviteAccept from './pages/InviteAccept.jsx';
import PublicMenuRedirect from './pages/PublicMenuRedirect.jsx';
import SetPasswordPage from './pages/SetPasswordPage.jsx';
import PendingApprovalPage from './pages/PendingApprovalPage.jsx';
import SuspendedPage from './pages/SuspendedPage.jsx';

// Admin Page Imports
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminCompanies from './pages/admin/AdminCompanies.jsx';
import AdminCompanyDetail from './pages/admin/AdminCompanyDetail.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';

function ProtectedRoute({ children }) {
  const { user, isSuperAdmin, loading, currentCompany } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>Loading session...</h3>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  // Reverse Guard: Super admin goes to /admin
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  // Status check guards
  if (currentCompany?.status === 'suspended') {
    return <Navigate to="/suspended" replace />;
  }
  if (currentCompany?.status === 'pending' || currentCompany?.status === 'restricted') {
    return <Navigate to="/pending-approval" replace />;
  }
  
  return children;
}

function SuperAdminGate({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>Loading session...</h3>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!isSuperAdmin) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAF8F5',
        color: 'var(--text)',
        fontFamily: 'var(--font-en)',
        padding: '16px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ color: '#DC2626', margin: '0 0 12px 0', fontSize: '24px', fontWeight: '800' }}>Access Denied (403)</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            You do not have access to the super administration console.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-color)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '14px'
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }
  return children || <Outlet />;
}

// Back-compat product details redirect to scoped branch
function ProductDetailRedirect() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') || 'en';
  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await loadCompanyBranches(slug);
        if (cancelled) return;
        if (result && result.branches && result.branches.length > 0) {
          const activeBranches = result.branches.filter(b => b.is_active);
          const targetBranch = activeBranches.find(b => b.is_default) || activeBranches[0] || result.branches[0];
          navigate(`/menu/${slug}/${targetBranch.slug}/product/${productId}?lang=${lang}`, { replace: true });
        } else {
          navigate(`/menu/${slug}/main/product/${productId}?lang=${lang}`, { replace: true });
        }
      } catch (e) {
        console.error(e);
        navigate(`/menu/${slug}/main/product/${productId}?lang=${lang}`, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [slug, productId, navigate, lang]);

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
      <h3>Loading product details...</h3>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/set-password" element={<SetPasswordPage />} />
        <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Super Admin Panel Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<SuperAdminGate><AdminLayout /></SuperAdminGate>}>
          <Route index element={<AdminCompanies />} />
          <Route path="companies/:companyId" element={<AdminCompanyDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="/menu/:slug" element={<PublicMenuRedirect />} />
        <Route path="/menu/:slug/:branchSlug" element={<PublicMenu />} />
        <Route path="/menu/:slug/product/:productId" element={<ProductDetailRedirect />} />
        <Route path="/menu/:slug/:branchSlug/product/:productId" element={<ProductDetail />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
