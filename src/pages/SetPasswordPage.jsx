import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Wait 200ms to allow Supabase SDK to auto-consume hashes from confirmation redirect link
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
          setSession(data.session);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccessMsg('Password updated successfully! Redirecting...');
      const userEmail = session?.user?.email || '';

      // Sign out current temp session per user requirement
      await supabase.auth.signOut();

      // Redirect after 1.5s
      setTimeout(() => {
        navigate(`/auth?activated=1&email=${encodeURIComponent(userEmail)}`, { replace: true });
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to set password. Try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3 style={{ color: 'var(--text-soft)' }}>Verifying activation link...</h3>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h2v2H7z" />
              <path d="M7 15h2v2H7z" />
              <path d="M15 7h2v2h-2z" />
              <path d="M15 15h2v2h-2z" />
            </svg>
            <span>QRious</span>
          </div>

          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          
          <h2 className="auth-title" style={{ fontSize: '18px', marginBottom: '12px', lineHeight: '1.4', fontWeight: '800' }}>
            Activation Link Invalid or Expired<br />
            <span style={{ fontSize: '14px', color: 'var(--text-soft, #71717a)', fontWeight: 'normal' }}>
              رابط التنشيط غير صالح أو منتهي الصلاحية.
            </span>
          </h2>
          
          <p style={{ color: 'var(--text-soft, #71717a)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
            Please make sure you clicked the correct link from your email. Alternatively, register a new account.
          </p>

          <Link to="/auth" className="btn-submit-auth" style={{ display: 'block', textDecoration: 'none', lineHeight: '2.5' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h2v2H7z" />
            <path d="M7 15h2v2H7z" />
            <path d="M15 7h2v2h-2z" />
            <path d="M15 15h2v2h-2z" />
          </svg>
          <span>QRious</span>
        </div>

        <h2 className="auth-title" style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '6px' }}>
          Set Your Password
        </h2>
        <p style={{ color: 'var(--text-soft, #71717a)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: '1.4' }}>
          Pick a password to finish activating your account.<br />
          <span style={{ fontSize: '12px', fontWeight: 'normal' }}>اختر كلمة مرور لإكمال تنشيط حسابك.</span>
        </p>

        {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
        {successMsg && <div className="auth-alert success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input 
              id="new-password"
              type="password" 
              placeholder="Min. 8 characters" 
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
              placeholder="Re-enter password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-submit-auth"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
