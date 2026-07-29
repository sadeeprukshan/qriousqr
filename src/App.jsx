import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useSearchParams, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { useLang } from './context/LanguageContext.jsx';
import { loadCompanyBranches } from './services/dataService.js';
import PublicMenu from './pages/PublicMenu.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import PublicMenuRedirect from './pages/PublicMenuRedirect.jsx';
import RootErrorBoundary from './components/RootErrorBoundary.jsx';
import AppLoader from './components/AppLoader.jsx';

// Lazy-loaded pages
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const InviteAccept = lazy(() => import('./pages/InviteAccept.jsx'));
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage.jsx'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage.jsx'));
const SuspendedPage = lazy(() => import('./pages/SuspendedPage.jsx'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));

// Lazy-loaded Admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies.jsx'));
const AdminCompanyDetail = lazy(() => import('./pages/admin/AdminCompanyDetail.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers.jsx'));
const AdminClaims = lazy(() => import('./pages/admin/AdminClaims.jsx'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages.jsx'));

// Lazy-loaded Customer pages
const CustomerLoginPage = lazy(() => import('./pages/CustomerLoginPage.jsx'));
const CustomerRegisterPage = lazy(() => import('./pages/CustomerRegisterPage.jsx'));
const CustomerLayout = lazy(() => import('./pages/CustomerLayout.jsx'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard.jsx'));
const CustomerClaims = lazy(() => import('./pages/CustomerClaims.jsx'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile.jsx'));
const CustomerRestaurantSpace = lazy(() => import('./pages/CustomerRestaurantSpace.jsx'));

function ProtectedRoute({ children }) {
  const { user, isSuperAdmin, isCustomer, loading, currentCompany } = useAuth();
  const { pathname } = useLocation();
  
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
  if (isCustomer) {
    return <Navigate to="/customer" replace />;
  }
  // Reverse Guard: Super admin goes to /admin
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  // Status check guards
  if (currentCompany?.status === 'suspended' && pathname !== '/suspended') {
    return <Navigate to="/suspended" replace />;
  }
  if ((currentCompany?.status === 'pending' || currentCompany?.status === 'restricted') && pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }
  
  return children;
}

function SuperAdminGate({ children }) {
  const { user, isSuperAdmin, isCustomer, loading } = useAuth();
  
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
  if (isCustomer) {
    return <Navigate to="/customer" replace />;
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

function CustomerGate({ children }) {
  const { user, isCustomer, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>Loading session...</h3>
      </div>
    );
  }
  if (!user || !isCustomer) {
    return <Navigate to="/customer/login" replace />;
  }
  return children || <Outlet />;
}

// Back-compat product details redirect to scoped branch
function ProductDetailRedirect() {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await loadCompanyBranches(slug);
        if (cancelled) return;
        if (result && result.branches && result.branches.length > 0) {
          const activeBranches = result.branches.filter(b => b.is_active);
          const targetBranch = activeBranches.find(b => b.is_default) || activeBranches[0] || result.branches[0];
          navigate(`/menu/${slug}/${targetBranch.slug}/product/${productId}`, { replace: true });
        } else {
          navigate(`/menu/${slug}/main/product/${productId}`, { replace: true });
        }
      } catch (e) {
        console.error(e);
        navigate(`/menu/${slug}/main/product/${productId}`, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [slug, productId, navigate]);

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
      <h3>Loading product details...</h3>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootErrorBoundary>
        <Suspense fallback={<AppLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/set-password" element={<SetPasswordPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/suspended" element={<SuspendedPage />} />
            <Route path="/legal/terms" element={<TermsPage />} />
            <Route path="/legal/privacy" element={<PrivacyPage />} />
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
              <Route path="messages" element={<AdminMessages />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="claims" element={<AdminClaims />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            <Route path="/customer/login" element={<CustomerLoginPage />} />
            <Route path="/customer/register" element={<CustomerRegisterPage />} />
            
            {/* Customer Portal Layout (Handles Gate + Nav Island) */}
            <Route element={<CustomerLayout />}>
              <Route path="/customer" element={<CustomerDashboard />} />
              <Route path="/customer/claims" element={<CustomerClaims />} />
              <Route path="/customer/profile" element={<CustomerProfile />} />
              <Route path="/customer/restaurant/:slug" element={<CustomerRestaurantSpace />} />
              <Route path="/customer/menu/:slug" element={<CustomerRestaurantSpace />} />
            </Route>

            <Route path="/menu/:slug" element={<PublicMenuRedirect />} />
            <Route path="/menu/:slug/:branchSlug" element={<PublicMenu />} />
            <Route path="/menu/:slug/product/:productId" element={<ProductDetailRedirect />} />
            <Route path="/menu/:slug/:branchSlug/product/:productId" element={<ProductDetail />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </RootErrorBoundary>
    </AuthProvider>
  );
}
