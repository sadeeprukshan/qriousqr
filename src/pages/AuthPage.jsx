import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isMockMode } from '../supabaseClient.js';
import { emailExists } from '../services/adminService.js';
import { validateNewPassword } from '../lib/passwordRules.js';

const COUNTRIES = [
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' }
];

const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'EUR', name: 'Euro' }
];

export default function AuthPage() {
  const { signIn, signUp, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const inviteToken = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';

  // Tab mode & password reset mode states
  const [isRegister, setIsRegister] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isEmailConfirmSent, setIsEmailConfirmSent] = useState(false);
  
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsRegister(mode === 'register');
  }, [searchParams]);

  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery') || searchParams.get('mode') === 'reset';
    setIsResetMode(isRecovery);
  }, [searchParams]);

  // Auth redirect guards
  useEffect(() => {
    // Do not redirect while completing a password recovery — the user needs
    // to stay on this page long enough to enter a new password.
    if (isResetMode) return;

    if (user) {
      if (isSuperAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(inviteToken ? `/invite/${inviteToken}` : '/dashboard', { replace: true });
      }
    }
  }, [user, isSuperAdmin, navigate, inviteToken, isResetMode]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restNameEn, setRestNameEn] = useState('');
  const [restNameAr, setRestNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  
  // States
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [showNoAccountDialog, setShowNoAccountDialog] = useState(false);
  const [acceptedTos, setAcceptedTos] = useState(false);

  useEffect(() => {
    setAcceptedTos(false);
  }, [isRegister]);

  // Prefill email if invite email is present
  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail);
    }
  }, [inviteEmail]);

  // Handle activated status from set-password page
  useEffect(() => {
    if (searchParams.get('activated') === '1') {
      setSuccessMsg('Password set. Sign in to continue.');
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  // Handle Escape key to close No Account Dialog
  useEffect(() => {
    if (!showNoAccountDialog) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNoAccountDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNoAccountDialog]);

  // Handle register prefill and lock from sign-in dialog
  useEffect(() => {
    const mode = searchParams.get('mode');
    const emailParam = searchParams.get('email');
    if (mode === 'register' && emailParam) {
      setEmail(emailParam);
      setIsEmailLocked(true);
    }
  }, [searchParams]);

  // Auto-generate slug from English name if not manually modified
  useEffect(() => {
    if (!isRegister || isSlugEdited || inviteToken) return;
    const cleanSlug = restNameEn
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(cleanSlug);
  }, [restNameEn, isRegister, isSlugEdited, inviteToken]);

  // Auto-select currency based on country selection
  const handleCountryChange = (e) => {
    const code = e.target.value;
    setCountry(code);
    const found = COUNTRIES.find(c => c.code === code);
    if (found) {
      setCurrency(found.currency);
    }
  };

  const handleSlugChange = (e) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setIsSlugEdited(true);
  };

  const validateForm = () => {
    if (!email) {
      setErrorMsg('Please fill in all fields.');
      return false;
    }
    // Password required on sign-in or direct registration / mock signup
    if (!inviteToken) {
      const { ok, error } = validateNewPassword(password, isRegister ? confirmPassword : password);
      if (!ok) {
        setErrorMsg(error);
        return false;
      }
    }
    if (isRegister && !inviteToken) {
      if (!restNameEn || !restNameAr || !slug) {
        setErrorMsg('Please fill in all restaurant details.');
        return false;
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        setErrorMsg('URL slug can only contain lowercase letters, numbers, and hyphens.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    if (isRegister) {
      const { error } = await signUp({
        email, 
        password, 
        restNameEn: inviteToken ? '' : restNameEn, 
        restNameAr: inviteToken ? '' : restNameAr, 
        slug: inviteToken ? '' : slug, 
        country: inviteToken ? '' : country, 
        currency: inviteToken ? '' : currency,
        inviteToken
      });
      if (error) {
        setErrorMsg(error.message || 'Failed to create account.');
      } else {
        if (!isMockMode && inviteToken) {
          setIsEmailConfirmSent(true);
        } else {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => navigate(inviteToken ? `/invite/${inviteToken}` : '/dashboard'), 1500);
        }
      }
    } else {
      const { error, redirectTo } = await signIn(email, password);
      if (error) {
        if (error.message === 'Invalid login credentials') {
          const exists = await emailExists(email);
          if (exists === false) {
            setShowNoAccountDialog(true);
          } else {
            setErrorMsg('Incorrect password. Try again or use Forgot password. / كلمة المرور غير صحيحة. حاول مرة أخرى أو استخدم "نسيت كلمة المرور".');
          }
        } else {
          setErrorMsg(error.message || 'Sign-in failed. Please try again. / فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        }
      } else {
        setSuccessMsg('Signed in successfully! Redirecting...');
        const target = inviteToken ? `/invite/${inviteToken}` : (redirectTo || '/dashboard');
        setTimeout(() => navigate(target), 1000);
      }
    }
    setLoading(false);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const { ok, error } = validateNewPassword(newPassword, confirmPassword);
    if (!ok) {
      setErrorMsg(error);
      return;
    }

    setLoading(true);
    try {
      if (isMockMode) {
        setSuccessMsg('Password updated successfully! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        
        const { data: isSA } = await supabase.rpc('is_super_admin');
        setSuccessMsg('Password updated successfully! Redirecting...');
        setTimeout(() => navigate(isSA ? '/admin' : '/dashboard'), 1500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
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
    setLoading(true);
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
      setLoading(false);
    }
  };



  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h2v2H7z" />
            <path d="M7 15h2v2H7z" />
            <path d="M15 7h2v2h-2z" />
            <path d="M15 15h2v2h-2z" />
          </svg>
          <span>QRious</span>
        </Link>

        {isEmailConfirmSent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
            <h2 className="auth-title" style={{ fontSize: '18px', marginBottom: '12px', lineHeight: '1.4', fontWeight: '800' }}>
              Check your email to activate your account and set your password.<br />
              <span style={{ fontSize: '14px', color: 'var(--text-soft, #71717a)', fontWeight: 'normal' }}>
                تحقق من بريدك الإلكتروني لتنشيط حسابك وتعيين كلمة المرور الخاصة بك.
              </span>
            </h2>
            <p style={{ color: 'var(--text-soft, #71717a)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
              We sent an activation link to <strong style={{ color: 'var(--text-color, #18181b)' }}>{email}</strong>. Click the link to choose your password.
            </p>
            <button
              type="button"
              className="btn-submit-auth"
              onClick={() => {
                setIsEmailConfirmSent(false);
                setIsRegister(false);
                setPassword('');
                setErrorMsg('');
                setSuccessMsg('');
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : isResetMode ? (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '24px' }}>Set a New Password</h2>
            {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
            {successMsg && <div className="auth-alert success">{successMsg}</div>}

            <form onSubmit={handleResetPasswordSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input 
                  id="new-password"
                  type="password" 
                  placeholder="Min. 6 characters" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input 
                  id="confirm-password"
                  type="password" 
                  placeholder="Confirm new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="btn-submit-auth"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        ) : isForgotPassword ? (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>Reset your password</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
              Enter the email you signed up with. We'll send a link to reset your password.
            </p>
            {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
            {successMsg && <div className="auth-alert success">{successMsg}</div>}

            <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="reset-email">Email Address</label>
                <input 
                  id="reset-email"
                  type="email" 
                  placeholder="owner@restaurant.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="btn-submit-auth"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
          </>
        ) : (
          <>
            {/* Tab Swapper */}
            <div className="auth-tabs">
              <button 
                type="button" 
                className={`auth-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => {
                  setIsRegister(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Sign In
              </button>
              <button 
                type="button" 
                className={`auth-tab ${isRegister ? 'active' : ''}`}
                onClick={() => {
                  setIsRegister(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Create Account
              </button>
            </div>

            {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
            {successMsg && <div className="auth-alert success">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  id="email"
                  type="email" 
                  placeholder="owner@restaurant.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!inviteEmail || isEmailLocked}
                  className={(inviteEmail || isEmailLocked) ? 'readonly-input' : ''}
                  required 
                />
                {isRegister && isEmailLocked && (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEmailLocked(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        textDecoration: 'underline',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Change email / تغيير البريد الإلكتروني
                    </button>
                  </div>
                )}
              </div>

              {!inviteToken && (
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input 
                    id="password"
                    type="password" 
                    placeholder="Min. 6 characters" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  {!isRegister && (
                    <div style={{ textAlign: 'right', marginTop: '6px' }}>
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
                          color: 'var(--text-soft, #71717a)',
                          textDecoration: 'underline',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isRegister && !inviteToken && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input 
                    id="confirmPassword"
                    type="password" 
                    placeholder="Confirm password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
              )}

              {isRegister && !inviteToken && (
                <div className="auth-register-fields">
                  <div className="form-divider">Restaurant Details</div>

                  <div className="form-group">
                    <label htmlFor="restNameEn">Restaurant Name (English)</label>
                    <input 
                      id="restNameEn"
                      type="text" 
                      placeholder="e.g. Brewlab Cafe" 
                      value={restNameEn}
                      onChange={(e) => setRestNameEn(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="restNameAr">Restaurant Name (Arabic)</label>
                    <input 
                      id="restNameAr"
                      type="text" 
                      placeholder="مثال: مقهى برولاب" 
                      dir="rtl"
                      value={restNameAr}
                      onChange={(e) => setRestNameAr(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="slug">Menu URL Slug</label>
                    <div className="slug-input-wrapper">
                      <span className="slug-prefix">qrious.com/menu/</span>
                      <input 
                        id="slug"
                        type="text" 
                        placeholder="brewlab" 
                        value={slug}
                        onChange={handleSlugChange}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor="country">Country</label>
                      <select 
                        id="country"
                        value={country} 
                        onChange={handleCountryChange}
                      >
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group half">
                      <label htmlFor="currency">Currency</label>
                      <select 
                        id="currency"
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>{curr.code} ({curr.name})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {isRegister && !inviteToken && (
                <div style={{ display: 'flex', gap: '8px', margin: '12px 0', fontSize: '13px', color: 'var(--text-soft)', textAlign: 'left' }}>
                  <input
                    id="tos-accept"
                    type="checkbox"
                    checked={acceptedTos}
                    onChange={(e) => setAcceptedTos(e.target.checked)}
                    style={{ marginTop: '3px', flex: '0 0 auto' }}
                  />
                  <label htmlFor="tos-accept" style={{ lineHeight: 1.5 }}>
                    I agree to the <Link to="/legal/terms" target="_blank" rel="noopener">Terms</Link> and <Link to="/legal/privacy" target="_blank" rel="noopener">Privacy Policy</Link>.
                  </label>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-submit-auth"
                disabled={loading || (isRegister && !inviteToken && !acceptedTos)}
              >
                {loading ? 'Processing...' : (isRegister ? (inviteToken ? 'Create Account & Join' : 'Register & Build Menu') : 'Sign In')}
              </button>

              {isRegister && !isMockMode && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '12px', 
                  fontSize: '12px', 
                  color: 'var(--text-soft, #71717a)',
                  lineHeight: '1.4'
                }}>
                  {inviteToken ? (
                    <>
                      We'll email you a link to set your password.<br />
                      <span style={{ direction: 'rtl', display: 'inline-block', marginTop: '2px' }}>
                        سنرسل لك رابطاً عبر البريد الإلكتروني لتعيين كلمة المرور الخاصة بك.
                      </span>
                    </>
                  ) : (
                    <>
                      You'll use this password to sign in.<br />
                      <span style={{ direction: 'rtl', display: 'inline-block', marginTop: '2px' }}>
                        ستستخدم كلمة المرور هذه لتسجيل الدخول.
                      </span>
                    </>
                  )}
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {showNoAccountDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
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
            aria-labelledby="no-account-title"
            aria-describedby="no-account-description"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px 24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              boxSizing: 'border-box',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* user-plus inline SVG */}
            <div style={{
              display: 'inline-flex',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>

            <h2 id="no-account-title" style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text)' }}>
              No account found
            </h2>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0', color: 'var(--text-soft)', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              لم يتم العثور على حساب
            </h2>

            <p id="no-account-description" style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 8px 0' }}>
              There's no account for <strong>{email}</strong>. Would you like to create one?
            </p>
            <p style={{ color: 'var(--text-soft)', fontSize: '13px', lineHeight: '1.5', margin: '0 0 24px 0', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              لا يوجد حساب لـ <strong>{email}</strong>. هل ترغب في إنشاء حساب جديد؟
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowNoAccountDialog(false);
                  const emailInput = document.getElementById('email');
                  if (emailInput) emailInput.focus();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Try another email / جرب بريداً آخر
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoAccountDialog(false);
                  setIsRegister(true);
                  setIsEmailLocked(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                  navigate(`/auth?mode=register&email=${encodeURIComponent(email)}`, { replace: true });
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-color)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Create account / إنشاء حساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
