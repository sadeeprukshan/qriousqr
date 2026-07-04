import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../supabaseClient.js';

export default function SuspendedPage() {
  const { signOut, currentCompany } = useAuth();
  const navigate = useNavigate();
  
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuspendedReason = async () => {
      if (!currentCompany?.id) return;
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('status_reason, status')
          .eq('id', currentCompany.id)
          .single();
          
        if (!error && data) {
          setReason(data.status_reason || '');
          if (data.status === 'active') {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuspendedReason();
  }, [currentCompany?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3 style={{ color: 'var(--text-soft)' }}>Loading account status...</h3>
      </div>
    );
  }

  const nameEn = currentCompany?.name_en || 'Your Restaurant';
  const nameAr = currentCompany?.name_ar || 'مطعمك';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FAF8F5',
      fontFamily: 'var(--font-en)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '520px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        {/* Big red warning icon */}
        <div style={{
          display: 'inline-flex',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '36px',
          marginBottom: '24px'
        }}>
          🚫
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: '#DC2626' }}>
          Your account has been suspended.
        </h2>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#DC2626', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
          تم تعليق حسابك.
        </h2>
        
        <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
          Access to <strong style={{ color: 'var(--text)' }}>{nameEn} ({nameAr})</strong> has been suspended by the platform administration. Please contact QriousQR support to resolve this issue.
        </p>

        {reason && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            textAlign: 'left',
            marginBottom: '28px',
            lineHeight: '1.5'
          }}>
            <strong>Reason for suspension:</strong> {reason}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleSignOut}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Sign Out
          </button>
          
          <a
            href="mailto:support@qriousqr.com?subject=QriousQR%20Account%20Suspension%20Appeal"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '14px',
              flex: 1
            }}
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
