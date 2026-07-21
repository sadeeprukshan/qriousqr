import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminListCompanies, adminChangeCompanyStatus, adminResetOwnerPassword } from '../../services/adminService.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';

export default function AdminCompanyDetail() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');

  // Modals state
  const [reasonModal, setReasonModal] = useState({ show: false, targetStatus: null, reason: '' });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminListCompanies();
      const found = data.find(c => c.id === companyId || c.slug === companyId);
      if (!found) {
        throw new Error('Restaurant company not found.');
      }
      setCompany(found);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve company details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const triggerToast = (msg) => {
    setToast(msg);
  };

  const handleStatusChange = async (newStatus, reason = null) => {
    setErrorMsg('');
    try {
      await adminChangeCompanyStatus(companyId, newStatus, reason);
      triggerToast(`Status changed to ${newStatus}.`);
      loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update status.');
    }
  };

  const handleReasonSubmit = (e) => {
    e.preventDefault();
    handleStatusChange(reasonModal.targetStatus, reasonModal.reason);
    setReasonModal({ show: false, targetStatus: null, reason: '' });
  };

  const handleOpenReasonModal = (targetStatus) => {
    setReasonModal({ show: true, targetStatus, reason: '' });
  };

  const handlePasswordReset = async () => {
    if (!company?.owner_email) {
      triggerToast("Error: No owner email available.");
      return;
    }
    try {
      await adminResetOwnerPassword(company.owner_email);
      triggerToast(`Reset email sent to ${company.owner_email}`);
    } catch (err) {
      console.error(err);
      triggerToast(`Password reset error: ${err.message}`);
    }
  };

  const handleCopyLink = async () => {
    if (!company) return;
    const url = `${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/menu/${company.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      triggerToast("Link copied to clipboard!");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-soft)' }}>Loading details...</div>;
  }

  if (errorMsg && !company) {
    return (
      <div>
        <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '16px' }}>
          ← Back to List
        </button>
        <div style={{ color: '#D32F2F', background: '#FFEBEE', padding: '14px 20px', borderRadius: '8px', fontSize: '14px', borderLeft: '4px solid #D32F2F' }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      {/* Toast Alert */}
      <QSuccessToast
        message={toast}
        visible={toast !== ''}
        onDismiss={() => setToast('')}
      />

      {/* Back to List */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '700',
          color: 'var(--primary-color)',
          fontSize: '14px',
          marginBottom: '24px'
        }}
      >
        ← Back to List
      </button>

      {errorMsg && (
        <div style={{
          color: '#D32F2F',
          background: '#FFEBEE',
          padding: '14px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          borderLeft: '4px solid #D32F2F'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Grid container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }} className="admin-detail-grid">
        
        {/* Left Column: Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {company.logo_url ? (
                <img src={company.logo_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} />
              ) : (
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: company.theme_color || '#FF5722',
                  color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '800', fontSize: '24px'
                }}>
                  {company.name_en ? company.name_en.charAt(0).toUpperCase() : 'R'}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>{company.name_en}</h2>
                  
                  {/* Status Pills */}
                  {company.status === 'pending' && (
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FEF3C7', color: '#D97706' }}>Pending</span>
                  )}
                  {company.status === 'active' && (
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#D1FAE5', color: '#059669' }}>Active</span>
                  )}
                  {company.status === 'restricted' && (
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FFEDD5', color: '#EA580C' }}>Restricted</span>
                  )}
                  {company.status === 'suspended' && (
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FEE2E2', color: '#DC2626' }}>Suspended</span>
                  )}
                </div>
                {company.name_ar && <h3 style={{ fontSize: '16px', color: 'var(--text-soft)', margin: '4px 0 0 0', fontFamily: 'var(--font-ar)' }} dir="rtl">{company.name_ar}</h3>}
                <div style={{ fontSize: '12px', color: '#9e9c9a', marginTop: '8px' }}>
                  Registered on: {new Date(company.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Details Sections */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Ownership */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Ownership</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>OWNER EMAIL</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{company.owner_email || 'No email linked'}</div>
                  </div>
                  {company.owner_email && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(company.owner_email);
                        triggerToast("Email copied!");
                      }}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>OWNER UUID</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-soft)' }}>{company.owner_id || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Localization */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Localization</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>COUNTRY CODE</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{company.country_code || 'US'}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>CURRENCY CODE</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{company.currency_code || 'USD'}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Content Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-color)' }}>{company.branch_count || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>BRANCHES</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-color)' }}>{company.category_count || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>CATEGORIES</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-color)' }}>{company.product_count || 0}</div>
                  <div style={{ fontSize: '11px', color: '#9e9c9a', fontWeight: '700' }}>PRODUCTS</div>
                </div>
              </div>
            </div>

            {/* Status History / Log */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Status Log</h4>
              <div style={{ padding: '16px', backgroundColor: '#FAF8F5', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ fontWeight: '700', color: 'var(--text-soft)' }}>Current Status:</span>{' '}
                  <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{company.status}</span>
                </div>
                {company.status_reason && (
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--text-soft)' }}>Reason:</span>{' '}
                    <span style={{ color: '#D32F2F', fontWeight: '600' }}>"{company.status_reason}"</span>
                  </div>
                )}
                {company.status_changed_at && (
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--text-soft)' }}>Changed At:</span>{' '}
                    <span>{new Date(company.status_changed_at).toLocaleString()}</span>
                  </div>
                )}
                {company.status_changed_by && (
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--text-soft)' }}>Changed By (UUID):</span>{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{company.status_changed_by}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Actions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-soft)' }}>Actions Panel</h4>
            
            {/* Conditional Status Buttons */}
            {company.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('active')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ✔ Approve Restaurant
              </button>
            )}

            {company.status !== 'restricted' && company.status !== 'pending' && (
              <button
                onClick={() => handleOpenReasonModal('restricted')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #EA580C', backgroundColor: 'transparent', color: '#EA580C', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Restrict Access
              </button>
            )}

            {company.status !== 'suspended' && (
              <button
                onClick={() => handleOpenReasonModal('suspended')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Suspend Restaurant
              </button>
            )}

            {(company.status === 'restricted' || company.status === 'suspended') && (
              <button
                onClick={() => handleStatusChange('active')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Reactivate Restaurant
              </button>
            )}

            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '8px 0' }} />

            <button
              onClick={handlePasswordReset}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', color: 'var(--text)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
            >
              Reset Owner Password
            </button>

            <button
              onClick={handleCopyLink}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#FFFFFF', color: 'var(--text)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
            >
              Copy Menu Link
            </button>

            <a
              href={`${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/menu/${company.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary-color)', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
            >
              View Public Menu ↗
            </a>
          </div>
        </div>

      </div>

      {/* Reason Dialog Modal */}
      {reasonModal.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: reasonModal.targetStatus === 'suspended' ? '#DC2626' : '#EA580C'
            }}>
              {reasonModal.targetStatus === 'suspended' ? 'Suspend Restaurant' : 'Restrict Restaurant'}
            </h3>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-soft)', lineHeight: '1.4' }}>
              {reasonModal.targetStatus === 'suspended'
                ? 'Warning: Suspending this restaurant will take their public menus offline completely. State an optional reason below to show to the tenant.'
                : 'Restricting this restaurant blocks public access to their menus. They can still edit and set up their portal. State a reason below:'}
            </p>

            <form onSubmit={handleReasonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700' }}>Reason</label>
                <textarea
                  value={reasonModal.reason}
                  onChange={(e) => setReasonModal({ ...reasonModal, reason: e.target.value })}
                  placeholder="e.g. Terms of Service violation"
                  rows="3"
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-en)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReasonModal({ show: false, targetStatus: null, reason: '' })}
                  style={{
                    padding: '10px 16px',
                    background: '#FAF8F5',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    background: reasonModal.targetStatus === 'suspended' ? '#DC2626' : '#EA580C',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
