import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { supabase, isMockMode } from '../../supabaseClient.js';
import { emailExists } from '../../services/adminService.js';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!showNoAccountDialog) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNoAccountDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNoAccountDialog]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSigningIn(true);

    try {
      const { data, error, redirectTo } = await signIn(email, password);
      if (error) {
        if (error.message === 'Invalid login credentials') {
          const exists = await emailExists(email);
          if (exists === false) {
            setShowNoAccountDialog(true);
          } else {
            setErrorMsg('Incorrect password. Try again or reset it.');
          }
        } else {
          setErrorMsg(error.message || 'Invalid email or password');
        }
        return;
      }

      // Check if it's super admin
      if (redirectTo === '/admin') {
        navigate('/admin', { replace: true });
      } else {
        // Sign out immediately and reject
        await signOut();
        setErrorMsg('This account is not an administrator.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setSigningIn(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setSigningIn(true);
    try {
      if (isMockMode) {
        setSuccessMsg('Reset link sent! Please check your email.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        console.error('Password reset request error:', error);
        setErrorMsg(error.message || 'Could not send reset link. Please try again in a few minutes.');
        return;
      }
      setSuccessMsg('Reset link sent! Please check your email.');
    } catch (err) {
      console.error('Password reset request threw:', err);
      setErrorMsg('Network error. Please check your connection and try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#12100E',
      color: '#FFFFFF',
      fontFamily: 'var(--font-en)',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#1E1B18',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--primary-color)' }}>QRious Admin</h2>
          <p style={{ fontSize: '14px', color: '#8e8c8a', margin: 0 }}>Platform administration</p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.05em', color: '#c4c2c0' }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@qrious.com"
                style={{
                  background: '#2A2622',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {errorMsg && (
              <div style={{
                color: '#FF6B6B',
                fontSize: '13px',
                background: 'rgba(255, 107, 107, 0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: '4px solid #FF6B6B',
                lineHeight: '1.4'
              }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{
                color: '#10B981',
                fontSize: '13px',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: '4px solid #10B981',
                lineHeight: '1.4'
              }}>
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              style={{
                background: 'var(--primary-color)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: signingIn ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginTop: '10px'
              }}
            >
              {signingIn ? 'Sending...' : 'Send reset link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.05em', color: '#c4c2c0' }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@qrious.com"
                style={{
                  background: '#2A2622',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.05em', color: '#c4c2c0' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  background: '#2A2622',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8e8c8a',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {errorMsg && (
              <div style={{
                color: '#FF6B6B',
                fontSize: '13px',
                background: 'rgba(255, 107, 107, 0.1)',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: '4px solid #FF6B6B',
                lineHeight: '1.4'
              }}>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              style={{
                background: 'var(--primary-color)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: signingIn ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginTop: '10px'
              }}
            >
              {signingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>

      {showNoAccountDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '16px'
          }}
          onClick={() => setShowNoAccountDialog(false)}
        >
          <div 
            role="dialog"
            aria-labelledby="no-admin-title"
            aria-describedby="no-admin-description"
            style={{
              backgroundColor: '#1E1B18',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '32px 24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              boxSizing: 'border-box',
              textAlign: 'center',
              color: '#FFFFFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* user-x inline SVG */}
            <div style={{
              display: 'inline-flex',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="17" y1="8" x2="22" y2="13" />
                <line x1="22" y1="8" x2="17" y2="13" />
              </svg>
            </div>

            <h2 id="no-admin-title" style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: '#FFFFFF' }}>
              No admin account found
            </h2>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 16px 0', color: '#8e8c8a', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              لم يتم العثور على حساب مسؤول
            </h2>

            <p id="no-admin-description" style={{ color: '#c4c2c0', fontSize: '14px', lineHeight: '1.5', margin: '0 0 8px 0' }}>
              There's no admin account for <strong>{email}</strong>. If you meant to sign in as a restaurant owner, use the regular sign-in page.
            </p>
            <p style={{ color: '#8e8c8a', fontSize: '13px', lineHeight: '1.5', margin: '0 0 24px 0', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              لا يوجد حساب مسؤول لـ <strong>{email}</strong>. إذا كنت تقصد تسجيل الدخول كمالك مطعم، فيرجى استخدام صفحة تسجيل الدخول العادية.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowNoAccountDialog(false);
                  const emailInput = document.getElementById('email');
                  if (emailInput) emailInput.focus();
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E1B18',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Try another email / جرب بريداً آخر
              </button>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <a 
                  href="/auth"
                  style={{
                    color: 'var(--primary-color)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  Restaurant owner? Sign in here →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
