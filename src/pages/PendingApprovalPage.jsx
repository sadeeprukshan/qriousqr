import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../supabaseClient.js';

export default function PendingApprovalPage() {
  const { user, signOut, currentCompany, refreshMemberships, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  if (authLoading) {
    return <div style={{ display:'flex', height:'100vh', justifyContent:'center', alignItems:'center', fontFamily: 'var(--font-en)' }}><h3>Loading session...</h3></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  // Fetch full company details (like created_at and full name)
  const fetchDetails = async () => {
    if (!currentCompany?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentCompany.id)
        .single();
        
      if (!error && data) {
        setCompanyDetails(data);
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

  useEffect(() => {
    fetchDetails();
  }, [currentCompany?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!currentCompany?.id) return;
    
    const ch = supabase
      .channel(`company-status:${currentCompany.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'companies', 
          filter: `id=eq.${currentCompany.id}` 
        },
        (payload) => {
          if (payload.new.status === 'active') {
            // Trigger refresh in AuthContext so ProtectedRoute lets them in
            refreshMemberships().then(() => {
              navigate('/dashboard', { replace: true });
            });
          } else if (payload.new.status === 'suspended') {
            refreshMemberships().then(() => {
              navigate('/suspended', { replace: true });
            });
          } else {
            // Update local state (in case it became restricted, etc.)
            setCompanyDetails(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [currentCompany?.id, navigate, refreshMemberships]);

  // Fallback poll every 20 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!currentCompany?.id) return;
      try {
        const { data } = await supabase
          .from('companies')
          .select('status, status_reason')
          .eq('id', currentCompany.id)
          .single();
          
        if (data) {
          if (data.status === 'active') {
            clearInterval(interval);
            refreshMemberships().then(() => {
              navigate('/dashboard', { replace: true });
            });
          } else if (data.status === 'suspended') {
            clearInterval(interval);
            refreshMemberships().then(() => {
              navigate('/suspended', { replace: true });
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [currentCompany?.id, navigate, refreshMemberships]);

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

  if (!currentCompany && !companyDetails) {
    return (
      <div style={{ display:'flex', height:'100vh', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:'12px', backgroundColor:'#FAF8F5', fontFamily: 'var(--font-en)' }}>
        <h3>We couldn't find your restaurant.</h3>
        <p style={{ color:'var(--text-soft)', fontSize:'14px' }}>Try signing out and signing back in, or contact support.</p>
        <button onClick={handleSignOut} style={{ padding:'10px 20px', borderRadius:'8px', border:'1px solid var(--border)', background:'#fff', cursor:'pointer' }}>Sign out</button>
      </div>
    );
  }

  const isRestricted = companyDetails?.status === 'restricted';
  const nameEn = companyDetails?.name_en || currentCompany?.name_en || 'Your Restaurant';
  const nameAr = companyDetails?.name_ar || currentCompany?.name_ar || 'مطعمك';
  const slug = companyDetails?.slug || currentCompany?.slug || '';
  const dateStr = companyDetails?.created_at ? new Date(companyDetails.created_at).toLocaleDateString() : '';

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
        {/* Big amber clock icon */}
        <div style={{
          display: 'inline-flex',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#FFFBEB',
          color: '#D97706',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '36px',
          marginBottom: '24px'
        }}>
          ⏰
        </div>

        {isRestricted ? (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
              Your account is restricted.
            </h2>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#D97706', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              تم تقييد حسابك.
            </h2>
            {companyDetails?.status_reason && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                textAlign: 'left',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                <strong>Reason:</strong> {companyDetails.status_reason}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
              Your account is awaiting approval.
            </h2>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0', color: '#D97706', fontFamily: 'var(--font-ar)', direction: 'rtl' }}>
              حسابك قيد الانتظار للموافقة عليه.
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              The QriousQR team is reviewing your registration for <strong style={{ color: 'var(--text)' }}>{nameEn} ({nameAr})</strong>. You'll get an email when your account is approved. Menu access is disabled until then.
            </p>
          </>
        )}

        {/* Meta Row */}
        <div style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 0',
          marginBottom: '28px',
          textAlign: 'left',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-soft)', flex: 1 }}>Restaurant Name</span>
            <strong style={{ color: 'var(--text)' }}>{nameEn}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-soft)', flex: 1 }}>Menu Slug</span>
            <strong style={{ color: 'var(--text)' }}>{slug}</strong>
          </div>
          {dateStr && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-soft)', flex: 1 }}>Submitted Date</span>
              <strong style={{ color: 'var(--text)' }}>{dateStr}</strong>
            </div>
          )}
        </div>

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
            href="mailto:support@qriousqr.com?subject=QriousQR%20Account%20Approval%20Request"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-color)',
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
