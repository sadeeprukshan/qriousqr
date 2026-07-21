import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminListCustomers, adminDeleteCustomer } from '../../services/adminService.js';
import { COUNTRIES } from '../../lib/countries.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';

function RowActionMenu({ triggerRef, open, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flipped: false, ready: false });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function measure() {
      const t = triggerRef.current.getBoundingClientRect();
      const menuW = 220;
      const menuHEstimate = menuRef.current?.offsetHeight || 150;
      const gap = 6;

      let left = t.right - menuW;
      if (left < 8) left = 8;
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - 8 - menuW;

      let top = t.bottom + gap;
      let flipped = false;
      if (top + menuHEstimate > window.innerHeight - 8) {
        top = t.top - gap - menuHEstimate;
        flipped = true;
        if (top < 8) top = 8;
      }

      setPos({ top, left, flipped, ready: true });
    }

    measure();
    requestAnimationFrame(measure);

    function onScrollOrResize() { measure(); }
    window.addEventListener('scroll', onScrollOrResize, true);
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

function MenuItem({ icon, onSelect, children, tone, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`row-action-item ${tone === 'warn' ? 'warn' : ''} ${tone === 'danger' ? 'danger' : ''}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onSelect?.(); }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function MenuDivider() { return <div className="row-action-divider" />; }

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'never';
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  if (isNaN(diffMs) || diffMs < 0) return 'just now';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function getGenderLabel(gender) {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'other') return 'Other';
  return 'Prefer not to say';
}

function getInitials(first, last) {
  const f = first ? first[0].toUpperCase() : '';
  const l = last ? last[0].toUpperCase() : '';
  return f + l || '??';
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openRowId, setOpenRowId] = useState(null);
  const [toast, setToast] = useState('');

  // Modals state
  const [deleteModal, setDeleteModal] = useState({ show: false, customerId: null, email: '', confirmEmailInput: '' });

  const triggerRefs = useRef({});

  const loadData = async (query = '') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminListCustomers(query);
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve customers.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // triggerToast helper
  const triggerToast = (msg) => {
    setToast(msg);
  };

  const handleCopyText = async (text, label) => {
    setOpenRowId(null);
    try {
      await navigator.clipboard.writeText(text);
      triggerToast(`${label} copied to clipboard!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (customerId, email) => {
    setOpenRowId(null);
    setDeleteModal({ show: true, customerId, email, confirmEmailInput: '' });
  };

  const handleDeleteConfirm = async () => {
    const { customerId, email, confirmEmailInput } = deleteModal;
    if (confirmEmailInput.toLowerCase() !== email.toLowerCase()) {
      alert("Verification email does not match.");
      return;
    }

    setDeleteModal({ show: false, customerId: null, email: '', confirmEmailInput: '' });
    try {
      // Optimistic delete
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      await adminDeleteCustomer(customerId);
      triggerToast(`Customer ${email} has been deleted.`);
    } catch (err) {
      alert(err.message || 'Failed to delete customer.');
      loadData(searchQuery); // Reload list on failure
    }
  };

  const handleCopyRegisterLink = async () => {
    const link = `${window.location.origin}/customer/register`;
    try {
      await navigator.clipboard.writeText(link);
      triggerToast('Registration link copied!');
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve country details from code
  const getCountryDetail = (code) => {
    const found = COUNTRIES.find(c => c.code === code);
    return found ? `${found.flag} ${found.code}` : `🌐 ${code}`;
  };

  return (
    <div style={{ paddingBottom: '80px', fontFamily: 'var(--font-en)' }}>
      {/* Toast Alert */}
      <QSuccessToast
        message={toast}
        visible={toast !== ''}
        onDismiss={() => setToast('')}
      />

      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>
            Customers Directory ({customers.length})
          </h1>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '14px' }}>
            CRM listings of registered customers.
          </p>
        </div>
        <button
          onClick={() => loadData(searchQuery)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          Refresh Directory
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search customers by email, phone, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 36px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
          <svg
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-soft)',
              pointerEvents: 'none'
            }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Share Link button */}
        <button
          onClick={handleCopyRegisterLink}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--primary-color)',
            color: 'var(--primary-color)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Share Registration Link</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h3 style={{ color: 'var(--text-soft)' }}>Loading customer directory...</h3>
        </div>
      ) : errorMsg ? (
        <div style={{
          padding: '24px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          color: '#991B1B',
          fontSize: '14px'
        }}>
          {errorMsg}
        </div>
      ) : customers.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          
          {searchQuery ? (
            <>
              <h3 style={{ margin: '0 0 4px 0', fontWeight: '800' }}>No customers match "{searchQuery}"</h3>
              <p style={{ color: 'var(--text-soft)', margin: '0 0 20px 0', fontSize: '14px' }}>
                Try modifying your query or clearing filters.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-color)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 4px 0', fontWeight: '800' }}>No customers registered.</h3>
              <p style={{ color: 'var(--text-soft)', margin: '0 0 20px 0', fontSize: '14px' }}>
                Share the customer registration link to build your directory:
              </p>
              <button
                onClick={handleCopyRegisterLink}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-color)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Copy Link
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Gender</th>
                <th>Birthday</th>
                <th>Signed up</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const isOpen = openRowId === c.id;
                const fullName = `${c.first_name} ${c.last_name}`;

                return (
                  <tr key={c.id}>
                    {/* Customer initials avatar + full name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '13px',
                          border: '1px solid #E2E8F0'
                        }}>
                          {getInitials(c.first_name, c.last_name)}
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--text)' }}>
                          {fullName}
                        </span>
                      </div>
                    </td>

                    {/* Email and Phone */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>{c.email}</span>
                        <code style={{ fontSize: '11px', color: 'var(--text-soft)', fontFamily: 'monospace' }}>
                          {c.phone_code}{c.phone}
                        </code>
                      </div>
                    </td>

                    {/* Country */}
                    <td style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                      {getCountryDetail(c.country_code)}
                    </td>

                    {/* Gender */}
                    <td style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                      {getGenderLabel(c.gender)}
                    </td>

                    {/* Birthday */}
                    <td style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                      {c.birthday ? new Date(c.birthday).toLocaleDateString() : '-'}
                    </td>

                    {/* Created at (relative time) */}
                    <td style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
                      {formatRelativeTime(c.created_at)}
                    </td>

                    {/* Actions dropdown */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        ref={el => triggerRefs.current[c.id] = el}
                        onClick={() => setOpenRowId(isOpen ? null : c.id)}
                        className={`row-action-trigger ${isOpen ? 'open' : ''}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      <RowActionMenu
                        triggerRef={{ current: triggerRefs.current[c.id] }}
                        open={isOpen}
                        onClose={() => setOpenRowId(null)}
                      >
                        <MenuItem
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="20" height="16" x="2" y="4" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                          }
                          onSelect={() => handleCopyText(c.email, 'Email')}
                        >
                          Copy email
                        </MenuItem>

                        <MenuItem
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                          }
                          onSelect={() => handleCopyText(`${c.phone_code}${c.phone}`, 'Phone')}
                        >
                          Copy phone
                        </MenuItem>

                        <MenuDivider />

                        <MenuItem
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          }
                          tone="danger"
                          onSelect={() => handleDeleteClick(c.id, c.email)}
                        >
                          Delete customer
                        </MenuItem>
                      </RowActionMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 24px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 12px 0', color: '#DC2626' }}>
              Delete Customer Account
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you absolutely sure you want to permanently delete customer{' '}
              <strong style={{ color: 'var(--text)' }}>{deleteModal.email}</strong>? This action cannot be undone.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
                TYPE CUSTOMER EMAIL TO CONFIRM
              </label>
              <input
                type="text"
                placeholder={deleteModal.email}
                value={deleteModal.confirmEmailInput}
                onChange={(e) => setDeleteModal(prev => ({ ...prev, confirmEmailInput: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #DC2626',
                  borderRadius: '8px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteModal({ show: false, customerId: null, email: '', confirmEmailInput: '' })}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteModal.confirmEmailInput.toLowerCase() !== deleteModal.email.toLowerCase()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  opacity: deleteModal.confirmEmailInput.toLowerCase() === deleteModal.email.toLowerCase() ? 1 : 0.4
                }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
