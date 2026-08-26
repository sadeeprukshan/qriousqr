import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Link } from 'react-router-dom';

export default function InviteMagicLinkCard({ email, token, companyName }) {
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleRequest() {
    setRequesting(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          shouldCreateUser: false,
        },
      });
      if (error) {
        setErrorMsg(
          error.message.toLowerCase().includes('rate')
            ? 'Please wait a moment before requesting another link.'
            : 'Could not send the sign-in link. Please contact support.'
        );
      } else {
        setSent(true);
        setCooldown(60);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="invite-card">
      <div className="invite-icon-banner">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h2>{sent ? 'Check your email' : `Welcome to ${companyName || 'the team'}`}</h2>

      {!sent && (
        <>
          <p className="invite-text-desc" style={{ textAlign: 'center' }}>
            This invite is for <strong>{email}</strong>.
          </p>
          <p className="invite-auth-label" style={{ textAlign: 'center', margin: '16px 0', fontSize: '13px', lineHeight: '1.5' }}>
            We'll send you a one-time sign-in link to your inbox. Click it from this device to set your password and finish joining.
          </p>
          <button
            className="btn-submit-auth invite-btn"
            onClick={handleRequest}
            disabled={requesting}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {requesting ? 'Sending…' : 'Send me a sign-in link'}
          </button>
          {errorMsg && <p style={{ color: '#e74c3c', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{errorMsg}</p>}
          <p style={{ fontSize: '12px', color: 'var(--text-soft)', marginTop: '20px', textAlign: 'center' }}>
            Already have a password for this email?{' '}
            <Link to={`/auth?mode=login&email=${encodeURIComponent(email)}&invite=${token}`} style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
              Sign in instead
            </Link>
          </p>
        </>
      )}

      {sent && (
        <>
          <p className="invite-text-desc" style={{ textAlign: 'center' }}>
            We just sent a fresh sign-in link to <strong>{email}</strong>.
          </p>
          <p className="invite-auth-label" style={{ textAlign: 'center', margin: '16px 0', fontSize: '13px', lineHeight: '1.5' }}>
            Click it from this device to set your password and join.
          </p>
          <button
            className="btn-submit-auth invite-btn"
            onClick={handleRequest}
            disabled={requesting || cooldown > 0}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {cooldown > 0 ? `Send another link (${cooldown}s)` : (requesting ? 'Sending…' : 'Send another link')}
          </button>
          {errorMsg && <p style={{ color: '#e74c3c', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{errorMsg}</p>}
        </>
      )}
    </div>
  );
}
