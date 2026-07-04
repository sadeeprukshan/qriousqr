import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getInviteByToken, acceptInvite } from '../services/teamService.js';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, signOut, refreshMemberships } = useAuth();
  
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        if (!cancelled) {
          setErrorMsg('An error occurred while loading this invitation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!user || !inviteData) return;
    setAccepting(true);
    try {
      await acceptInvite(token, user.id);
      
      // Refresh user memberships in context
      if (refreshMemberships) {
        await refreshMemberships();
      }
      
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to accept invitation.');
      setAccepting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    // Keep them on this page so they can log in with the correct email
  };

  if (loading) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card loading-card">
          <div className="spinner"></div>
          <h3>Loading invitation details...</h3>
        </div>
      </div>
    );
  }

  if (errorMsg || !inviteData) {
    return (
      <div className="invite-page-shell">
        <div className="invite-card error-card">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" style={{ marginBottom: '16px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Invitation Unsuccessful</h2>
          <p className="invite-error-desc">{errorMsg || 'This invitation is no longer valid.'}</p>
          <Link to="/" className="btn-primary-landing" style={{ marginTop: '20px', display: 'inline-block' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { invite, companyName } = inviteData;
  const isCorrectUser = user && user.email.toLowerCase() === invite.email.toLowerCase();

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

        <h2>Join the Team!</h2>
        <p className="invite-text-desc">
          You've been invited to join <strong>{companyName}</strong> as a <span className="invite-role-highlight">{invite.role}</span>.
        </p>

        {user ? (
          isCorrectUser ? (
            <div className="invite-action-box">
              <p className="logged-in-as-label">
                Signed in as: <strong>{user.email}</strong>
              </p>
              <button 
                className="btn-submit-auth" 
                onClick={handleAccept}
                disabled={accepting}
                style={{ width: '100%', marginTop: '16px' }}
              >
                {accepting ? 'Joining...' : 'Accept Invitation & Go to Dashboard'}
              </button>
            </div>
          ) : (
            <div className="invite-action-box warning">
              <p className="invite-warning-text">
                This invite was sent to <strong>{invite.email}</strong>, but you are currently signed in as <strong>{user.email}</strong>.
              </p>
              <button 
                className="btn-save-profile" 
                onClick={handleSignOut}
                style={{ width: '100%', marginTop: '16px', background: '#e74c3c' }}
              >
                Sign Out to Switch Accounts
              </button>
            </div>
          )
        ) : (
          <div className="invite-action-box">
            <p className="invite-auth-label">
              Please authenticate with <strong>{invite.email}</strong> to accept this invitation:
            </p>
            <div className="invite-auth-buttons">
              <Link 
                to={`/auth?mode=login&email=${encodeURIComponent(invite.email)}&invite=${token}`} 
                className="btn-submit-auth invite-btn"
                style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
              >
                Sign In
              </Link>
              <Link 
                to={`/auth?mode=register&email=${encodeURIComponent(invite.email)}&invite=${token}`} 
                className="btn-save-profile invite-btn"
                style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
