import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInviteByToken, acceptInvite } from '../services/teamService.js';
import { validateNewPassword } from '../lib/passwordRules.js';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, signOut, refreshMemberships, loading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isInviteSession, setIsInviteSession] = useState(false);

  // Detect invite session hash on mount before SDK strips it
  useEffect(() => {
    if (window.location.hash.includes('type=invite')) {
      setIsInviteSession(true);
    }
  }, []);

  // 1. Load invite by token on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const data = await getInviteByToken(token);
        if (cancelled) return;
        if (!data) {
          setErrorMsg('This invite link is invalid, expired, or has already been accepted.');
        } else {
          setInviteData(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMsg('An error occurred while loading this invitation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSetPasswordAndAccept = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { ok, error } = validateNewPassword(newPassword, confirmPassword);
    if (!ok) { setErrorMsg(error); return; }

    if (!user || !inviteData) {
      setErrorMsg('Session expired. Please click the invite link from your email again.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Set the password
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) throw pwErr;

      // 2. Accept the invite (inserts company_members row, marks accepted)
      await acceptInvite(token, user.id);

      // 3. Kill the invite session
      await signOut();

      // 4. Redirect to login with email + welcome context
      const email = encodeURIComponent(inviteData.invite.email);
      const company = encodeURIComponent(inviteData.companyName || 'your team');
      navigate(`/auth?email=${email}&joined=${company}`, { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to set password and accept invitation.');
      setSubmitting(false);
    }
  };

  const handleAcceptOnly = async () => {
    if (!user || !inviteData) return;
    setSubmitting(true);
    try {
      await acceptInvite(token, user.id);
      if (refreshMemberships) {
        await refreshMemberships();
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to accept invitation.');
      setSubmitting(false);
    }
  };

  // --- render ---

  if (loading || authLoading) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card loading-card">
          <div className="spinner"></div>
          <h3>Loading invitation…</h3>
        </div>
      </div>
    );
  }

  if (errorMsg && !inviteData) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card error-card">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" style={{ marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Invitation unavailable</h2>
          <p className="invite-error-desc">{errorMsg}</p>
          <Link to="/" className="btn-primary-landing" style={{ marginTop: '20px', display: 'inline-block' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { invite, companyName } = inviteData;

  // FALLBACK CASE: invitee reached /invite/<token> without an active session
  if (!user) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card">
          <div className="invite-icon-banner">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h2>Join {companyName}</h2>
          <p className="invite-text-desc">
            You've been invited as <span className="invite-role-highlight">{invite.role}</span>.
          </p>
          <p className="invite-auth-label">
            This invite was sent to <strong>{invite.email}</strong>. Sign in with that account to accept:
          </p>
          <div className="invite-auth-buttons">
            <Link
              to={`/auth?mode=login&email=${encodeURIComponent(invite.email)}&invite=${token}`}
              className="btn-submit-auth invite-btn"
              style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // WRONG-EMAIL CASE: signed in as someone else
  const isCorrectUser = user.email?.toLowerCase() === invite.email.toLowerCase();
  if (!isCorrectUser) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card">
          <h2>Wrong account signed in</h2>
          <p className="invite-warning-text">
            This invite was sent to <strong>{invite.email}</strong>, but you're currently signed in as <strong>{user.email}</strong>.
          </p>
          <button
            className="btn-save-profile"
            onClick={async () => { await signOut(); }}
            style={{ width: '100%', marginTop: '16px', background: '#e74c3c' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // EXISTING-USER / ACCEPT-ONLY CASE: signed in (correct email) but not via direct invite link with hash
  if (!isInviteSession) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card">
          <div className="invite-icon-banner">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h2>Join {companyName}</h2>
          <p className="invite-text-desc">
            You've been invited to join <strong>{companyName}</strong> as a <span className="invite-role-highlight">{invite.role}</span>.
          </p>
          <p className="logged-in-as-label" style={{ marginTop: '16px', textAlign: 'center' }}>
            Signed in as: <strong>{user.email}</strong>
          </p>
          <button
            className="btn-submit-auth"
            onClick={handleAcceptOnly}
            disabled={submitting}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {submitting ? 'Joining…' : `Accept invitation`}
          </button>
        </div>
      </div>
    );
  }

  // MAIN CASE: signed in via invite link hash, need to set password to activate the account
  return (
    <div className="invite-page-shell">
      <div className="invite-card">
        <div className="invite-icon-banner">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <h2>Welcome to {companyName}</h2>
        <p className="invite-text-desc">
          You've been invited as <span className="invite-role-highlight">{invite.role}</span>.
          To activate your account, set a password below. You'll use it every time you sign in.
        </p>

        <form onSubmit={handleSetPasswordAndAccept} style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6–72 characters"
              required
              minLength={6}
              maxLength={72}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              required
              minLength={6}
              maxLength={72}
            />
          </div>

          {errorMsg && (
            <p style={{ color: '#e74c3c', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            className="btn-submit-auth"
            disabled={submitting}
            style={{ width: '100%', marginTop: '24px' }}
          >
            {submitting ? 'Activating…' : `Set password & join ${companyName}`}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--text-soft, #71717a)', marginTop: '20px', textAlign: 'center', lineHeight: '1.4' }}>
          After you set your password, you'll be taken to the sign-in page to enter it once and land on your Dashboard.
        </p>
      </div>
    </div>
  );
}
