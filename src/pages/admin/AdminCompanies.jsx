import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { adminListCompanies, adminChangeCompanyStatus, adminResetOwnerPassword } from '../../services/adminService.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';

// Helper to resolve flag emojis from country codes
function getCountryFlag(code) {
  if (!code) return '🌐';
  const c = code.toUpperCase();
  if (c === 'US') return '🇺🇸';
  if (c === 'AE') return '🇦🇪';
  if (c === 'SA') return '🇸🇦';
  if (c === 'LB') return '🇱🇧';
  if (c === 'EG') return '🇪🇬';
  if (c === 'JO') return '🇯🇴';
  if (c === 'KW') return '🇰🇼';
  if (c === 'QA') return '🇶🇦';
  if (c === 'BH') return '🇧🇭';
  if (c === 'OM') return '🇴🇲';
  if (c === 'GB') return '🇬🇧';
  if (c === 'EU') return '🇪🇺';
  if (c === 'IN') return '🇮🇳';
  if (c === 'PK') return '🇵🇰';
  if (c === 'BD') return '🇧🇩';
  if (c === 'LK') return '🇱🇰';
  if (c === 'TR') return '🇹🇷';
  if (c === 'MA') return '🇲🇦';
  if (c === 'TN') return '🇹🇳';
  if (c === 'DZ') return '🇩🇿';
  return '🌐';
}

function RowActionMenu({ triggerRef, open, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flipped: false, ready: false });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function measure() {
      const t = triggerRef.current.getBoundingClientRect();
      const menuW = 240; // matches CSS min-width; overshoot slightly for safety
      const menuHEstimate = menuRef.current?.offsetHeight || 300;
      const gap = 6;

      // Horizontal: anchor to the RIGHT edge of the trigger, extending leftward.
      // Clamp inside viewport.
      let left = t.right - menuW;
      if (left < 8) left = 8;
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - 8 - menuW;

      // RTL: anchor to the LEFT edge, extending rightward.
      if (document.body.dir === 'rtl') {
        left = t.left;
        if (left + menuW > window.innerWidth - 8) left = window.innerWidth - 8 - menuW;
        if (left < 8) left = 8;
      }

      // Vertical: default below. Flip above if it would overflow.
      let top = t.bottom + gap;
      let flipped = false;
      if (top + menuHEstimate > window.innerHeight - 8) {
        top = t.top - gap - menuHEstimate;
        flipped = true;
        if (top < 8) top = 8; // last resort
      }

      setPos({ top, left, flipped, ready: true });
    }

    measure();
    // Re-measure once we know the actual menu height
    requestAnimationFrame(measure);

    function onScrollOrResize() { measure(); }
    window.addEventListener('scroll', onScrollOrResize, true); // capture: catches scroll inside any container
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e) {
      if (menuRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); triggerRef.current?.focus(); }
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={`row-action-menu ${pos.flipped ? 'flipped' : ''} ${pos.ready ? 'ready' : ''}`}
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body
  );
}

function MenuItem({ icon, onSelect, children, tone }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`row-action-item ${tone === 'warn' ? 'warn' : ''} ${tone === 'danger' ? 'danger' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function MenuDivider() { return <div className="row-action-divider" />; }

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'restricted' | 'suspended'
  const [openRowId, setOpenRowId] = useState(null);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const triggerRefs = useRef({});

  // Modals state
  const [reasonModal, setReasonModal] = useState({ show: false, cid: null, targetStatus: null, reason: '' });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminListCompanies();
      // Ensure each row has a status default
      const processed = data.map(c => ({
        ...c,
        status: c.status || 'active'
      }));
      setCompanies(processed);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
  };

  // Compute counts from loaded rows
  const counts = useMemo(() => {
    const countsObj = { all: companies.length, pending: 0, active: 0, restricted: 0, suspended: 0 };
    companies.forEach(c => {
      const s = c.status;
      if (countsObj[s] !== undefined) {
        countsObj[s]++;
      }
    });
    return countsObj;
  }, [companies]);

  // Filtered and Searched companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (c.name_en || '').toLowerCase().includes(q) || 
        (c.name_ar || '').toLowerCase().includes(q) || 
        (c.slug || '').toLowerCase().includes(q) || 
        (c.owner_email || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [companies, statusFilter, searchQuery]);

  // Handle direct status changes (e.g. approve/reactivate)
  const handleStatusChange = async (cid, newStatus, reason = null) => {
    setErrorMsg('');
    const original = [...companies];
    
    // Optimistic Update
    setCompanies(prev => prev.map(c => c.id === cid ? { ...c, status: newStatus, status_reason: reason } : c));

    try {
      await adminChangeCompanyStatus(cid, newStatus, reason);
      triggerToast(`Status successfully changed to ${newStatus}.`);
      loadData(); // refresh counts and data correctly
    } catch (err) {
      console.error(err);
      setCompanies(original); // Revert
      setErrorMsg(err.message || 'Failed to update status.');
    }
  };

  const handleOpenReasonModal = (cid, targetStatus) => {
    setReasonModal({ show: true, cid, targetStatus, reason: '' });
  };

  const handleReasonSubmit = (e) => {
    e.preventDefault();
    handleStatusChange(reasonModal.cid, reasonModal.targetStatus, reasonModal.reason);
    setReasonModal({ show: false, cid: null, targetStatus: null, reason: '' });
  };

  const handlePasswordReset = async (email) => {
    if (!email) {
      triggerToast("Error: No email address linked to this owner.");
      return;
    }
    try {
      await adminResetOwnerPassword(email);
      triggerToast(`Reset email sent to ${email} (subject to Supabase SMTP).`);
    } catch (err) {
      console.error(err);
      triggerToast(`Password reset error: ${err.message}`);
    }
  };

  const handleCopyLink = async (slug) => {
    const url = `${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/menu/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      triggerToast("Link copied to clipboard!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast Alert */}
      <QSuccessToast
        message={toast}
        visible={toast !== ''}
        onDismiss={() => setToast('')}
      />

      {/* Header controls row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Status Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['all', 'pending', 'active', 'restricted', 'suspended'].map(status => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--primary-color)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {status} ({counts[status]})
              </button>
            );
          })}
        </div>

        {/* Search & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '380px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by name, slug, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                outline: 'none',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            onClick={loadData}
            title="Refresh list"
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

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

      {/* Companies List Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '15px' }}>
            Loading companies...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '15px' }}>
            No restaurants found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#FCFBF9', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Restaurant</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Slug</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Owner</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Country</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Menu Size</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map(c => {
                  const initial = c.name_en ? c.name_en.charAt(0).toUpperCase() : 'R';
                  if (!triggerRefs.current[c.id]) {
                    triggerRefs.current[c.id] = React.createRef();
                  }
                  const triggerRef = triggerRefs.current[c.id];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/admin/companies/${c.id}`)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      className="admin-table-row"
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {c.logo_url ? (
                            <img src={c.logo_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }} />
                          ) : (
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: c.theme_color || '#FF5722',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '14px'
                            }}>
                              {initial}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)' }}>{c.name_en}</div>
                            {c.name_ar && <div style={{ fontSize: '12px', color: 'var(--text-soft)', fontFamily: 'var(--font-ar)' }} dir="rtl">{c.name_ar}</div>}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <code style={{ fontSize: '13px', fontFamily: 'ui-monospace, monospace', color: 'var(--text-soft)' }}>
                          {c.slug}
                        </code>
                      </td>

                      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-soft)' }}>
                        {c.owner_email || <span style={{ fontStyle: 'italic', color: '#b9b7b5' }}>No email</span>}
                      </td>

                      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-soft)' }}>
                        {getCountryFlag(c.country_code)} {c.country_code || 'US'}
                      </td>

                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-soft)' }}>
                        {c.branch_count || 0}b · {c.category_count || 0}c · {c.product_count || 0}p
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        {/* Status Pills */}
                        {c.status === 'pending' && (
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FEF3C7', color: '#D97706' }}>
                            Pending
                          </span>
                        )}
                        {c.status === 'active' && (
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#D1FAE5', color: '#059669' }}>
                            Active
                          </span>
                        )}
                        {c.status === 'restricted' && (
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FFEDD5', color: '#EA580C' }}>
                            Restricted
                          </span>
                        )}
                        {c.status === 'suspended' && (
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                            Suspended
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-block' }}>
                          <button
                            ref={triggerRef}
                            data-row-id={c.id}
                            onClick={(e) => {
                              e.preventDefault();
                              setOpenRowId(openRowId === c.id ? null : c.id);
                            }}
                            className={`row-action-trigger ${openRowId === c.id ? 'open' : ''}`}
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={openRowId === c.id}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>

                          <RowActionMenu
                            triggerRef={triggerRef}
                            open={openRowId === c.id}
                            onClose={() => setOpenRowId(null)}
                          >
                            {/* Neutral group */}
                            <a
                              href={`${import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin}/menu/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="row-action-item"
                              role="menuitem"
                              onClick={() => setOpenRowId(null)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              Open menu ↗
                            </a>

                            <MenuItem
                              icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              }
                              onSelect={() => handleCopyLink(c.slug)}
                            >
                              Copy menu link
                            </MenuItem>

                            <MenuItem
                              icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              }
                              onSelect={() => navigate(`/admin/companies/${c.id}`)}
                            >
                              View details
                            </MenuItem>

                            {/* Status group */}
                            <MenuDivider />
                            
                            {c.status === 'pending' && (
                              <MenuItem
                                icon={
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                  </svg>
                                }
                                onSelect={() => handleStatusChange(c.id, 'active')}
                              >
                                Approve
                              </MenuItem>
                            )}

                            {(c.status === 'restricted' || c.status === 'suspended') && (
                              <MenuItem
                                icon={
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polygon points="10 8 16 12 10 16 10 8" />
                                  </svg>
                                }
                                onSelect={() => handleStatusChange(c.id, 'active')}
                              >
                                Reactivate
                              </MenuItem>
                            )}

                            {c.status !== 'restricted' && c.status !== 'pending' && (
                              <MenuItem
                                icon={
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                }
                                onSelect={() => handleOpenReasonModal(c.id, 'restricted')}
                                tone="warn"
                              >
                                Restrict…
                              </MenuItem>
                            )}

                            {c.status !== 'suspended' && (
                              <MenuItem
                                icon={
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                  </svg>
                                }
                                onSelect={() => handleOpenReasonModal(c.id, 'suspended')}
                                tone="danger"
                              >
                                Suspend…
                              </MenuItem>
                            )}

                            {/* Destructive-ish group */}
                            <MenuDivider />
                            
                            <MenuItem
                              icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                              }
                              onSelect={() => handlePasswordReset(c.owner_email)}
                              tone="danger"
                            >
                              Reset owner password
                            </MenuItem>
                          </RowActionMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  onClick={() => setReasonModal({ show: false, cid: null, targetStatus: null, reason: '' })}
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
