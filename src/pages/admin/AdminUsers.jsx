import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminListUsers, adminToggleSuperAdmin, adminDeleteUser, adminResetOwnerPassword } from '../../services/adminService.js';
import QSuccessToast from '../../components/QSuccessToast.jsx';

function RowActionMenu({ triggerRef, open, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flipped: false, ready: false });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function measure() {
      const t = triggerRef.current.getBoundingClientRect();
      const menuW = 240;
      const menuHEstimate = menuRef.current?.offsetHeight || 220;
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
      className={`row-action-item ${tone === 'warn' ? 'warn' : ''} ${tone === 'danger' ? 'danger' : ''} ${disabled ? 'disabled-item' : ''}`}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onSelect?.(); }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function MenuDivider() { return <div className="row-action-divider" />; }

// Helper to format relative time
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

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'super' | 'owner' | 'team'
  const [openRowId, setOpenRowId] = useState(null);
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [toast, setToast] = useState('');

  // Modals state
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, email: '', confirmEmailInput: '' });
  const [superAdminModal, setSuperAdminModal] = useState({ show: false, userId: null, email: '', makeSuper: false });

  const triggerRefs = useRef({});

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminListUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);



  // Compute counts
  const counts = useMemo(() => {
    const res = { all: 0, super: 0, owner: 0, team: 0 };
    users.forEach(u => {
      res.all++;
      if (u.is_super_admin) {
        res.super++;
      }
      const roles = (u.tenants || []).map(t => t.role);
      if (roles.includes('owner')) {
        res.owner++;
      }
      if (roles.some(r => r === 'manager' || r === 'staff')) {
        res.team++;
      }
    });
    return res;
  }, [users]);

  // Filter & Search logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search check
      const emailMatch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!emailMatch) return false;

      // Filter chip check
      if (filterType === 'super') return u.is_super_admin;
      if (filterType === 'owner') return (u.tenants || []).some(t => t.role === 'owner');
      if (filterType === 'team') return (u.tenants || []).some(t => t.role === 'manager' || t.role === 'staff');
      return true;
    });
  }, [users, searchQuery, filterType]);

  const toggleExpand = (userId) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleResetPassword = async (email) => {
    setOpenRowId(null);
    try {
      await adminResetOwnerPassword(email);
      setToast(`Password reset link sent to ${email}`);
    } catch (err) {
      alert(err.message || 'Failed to trigger password reset.');
    }
  };

  const handleToggleSuperAdminClick = (userId, email, makeSuper) => {
    setOpenRowId(null);
    setSuperAdminModal({ show: true, userId, email, makeSuper });
  };

  const handleToggleSuperAdminConfirm = async () => {
    const { userId, makeSuper, email } = superAdminModal;
    setSuperAdminModal({ show: false, userId: null, email: '', makeSuper: false });
    try {
      await adminToggleSuperAdmin(userId, makeSuper);
      setToast(`${email} is now a ${makeSuper ? 'Super Admin' : 'Regular User'}`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update user super admin status.');
    }
  };

  const handleDeleteUserClick = (userId, email) => {
    setOpenRowId(null);
    setDeleteModal({ show: true, userId, email, confirmEmailInput: '' });
  };

  const handleDeleteUserConfirm = async () => {
    const { userId, email, confirmEmailInput } = deleteModal;
    if (confirmEmailInput.toLowerCase() !== email.toLowerCase()) {
      alert("Verification email does not match.");
      return;
    }

    setDeleteModal({ show: false, userId: null, email: '', confirmEmailInput: '' });
    try {
      await adminDeleteUser(userId);
      setToast(`User ${email} has been permanently deleted.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const getInitials = (email) => {
    if (!email) return '??';
    const clean = email.split('@')[0].toUpperCase();
    if (clean.length === 1) return clean;
    return clean.slice(0, 2);
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
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
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>Users Directory</h1>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '14px' }}>
            Manage platform administrators, restaurant owners, and staff members.
          </p>
        </div>
        <button
          onClick={loadData}
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

      {/* Filter and Search Bar */}
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
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'super', label: 'Super Admins', count: counts.super },
            { id: 'owner', label: 'Tenant Owners', count: counts.owner },
            { id: 'team', label: 'Team Members', count: counts.team }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filterType === chip.id ? 'var(--primary-color)' : 'var(--border)',
                backgroundColor: filterType === chip.id ? 'var(--primary-color)' : 'transparent',
                color: filterType === chip.id ? '#FFFFFF' : 'var(--text-soft)'
              }}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search users by email..."
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
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h3 style={{ color: 'var(--text-soft)' }}>Loading directory...</h3>
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
      ) : filteredUsers.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ margin: '0 0 4px 0', fontWeight: '800' }}>No users found</h3>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '14px' }}>
            No records matched your search query or filter chip criteria.
          </p>
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
                <th style={{ width: '40%' }}>User</th>
                <th>Signed up</th>
                <th>Last active</th>
                <th>Tenants</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(userRow => {
                const isOpen = openRowId === userRow.id;
                const isExpanded = expandedUserIds.has(userRow.id);
                const selfCheck = currentUser && currentUser.id === userRow.id;

                return (
                  <React.Fragment key={userRow.id}>
                    <tr className={userRow.is_super_admin ? 'is-super-admin' : ''}>
                      {/* User Avatar + Email */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: userRow.is_super_admin ? '#FFF1F2' : '#F1F5F9',
                            color: userRow.is_super_admin ? '#E11D48' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '13px',
                            border: '1px solid',
                            borderColor: userRow.is_super_admin ? '#FDA4AF' : '#E2E8F0'
                          }}>
                            {getInitials(userRow.email)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '700', color: 'var(--text)' }}>
                                {userRow.email}
                              </span>
                              {selfCheck && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#F1F5F9',
                                  color: '#475569',
                                  fontWeight: '700'
                                }}>YOU</span>
                              )}
                            </div>
                            {userRow.is_super_admin && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                color: '#E11D48',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Super Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Signed up date */}
                      <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>
                        {formatRelativeTime(userRow.created_at)}
                      </td>

                      {/* Last active date */}
                      <td style={{ color: 'var(--text-soft)', fontSize: '13px' }}>
                        {formatRelativeTime(userRow.last_sign_in_at)}
                      </td>

                      {/* Tenants listing pills */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(userRow.tenants || []).map((t, idx) => (
                            <Link
                              key={idx}
                              to={`/admin/companies/${t.slug}`}
                              className={`tenant-pill status-${t.status || 'active'}`}
                            >
                              {t.name_en} ({t.role})
                            </Link>
                          ))}
                          {(userRow.tenants || []).length === 0 && (
                            <span style={{ color: 'var(--text-soft)', fontSize: '13px', fontStyle: 'italic' }}>
                              none
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Row Action menu trigger */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          ref={el => triggerRefs.current[userRow.id] = el}
                          onClick={() => setOpenRowId(isOpen ? null : userRow.id)}
                          className={`row-action-trigger ${isOpen ? 'open' : ''}`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>

                        <RowActionMenu
                          triggerRef={{ current: triggerRefs.current[userRow.id] }}
                          open={isOpen}
                          onClose={() => setOpenRowId(null)}
                        >
                          <MenuItem
                            icon={
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            }
                            onSelect={() => { setOpenRowId(null); toggleExpand(userRow.id); }}
                          >
                            {isExpanded ? 'Hide tenant details' : 'View tenant details'}
                          </MenuItem>

                          <MenuItem
                            icon={
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            }
                            onSelect={() => handleResetPassword(userRow.email)}
                          >
                            Reset password
                          </MenuItem>

                          {userRow.is_super_admin ? (
                            <MenuItem
                              icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                </svg>
                              }
                              tone="warn"
                              disabled={selfCheck}
                              onSelect={() => handleToggleSuperAdminClick(userRow.id, userRow.email, false)}
                            >
                              Revoke super admin
                            </MenuItem>
                          ) : (
                            <MenuItem
                              icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                </svg>
                              }
                              onSelect={() => handleToggleSuperAdminClick(userRow.id, userRow.email, true)}
                            >
                              Promote to super admin
                            </MenuItem>
                          )}

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
                            disabled={selfCheck}
                            onSelect={() => handleDeleteUserClick(userRow.id, userRow.email)}
                          >
                            Delete user
                          </MenuItem>
                        </RowActionMenu>
                      </td>
                    </tr>

                    {/* Accordion list details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="5" style={{ backgroundColor: '#FAF8F5', padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-soft)' }}>
                              TENANTS ASSOCIATED ({ (userRow.tenants || []).length })
                            </div>
                            
                            {(userRow.tenants || []).length === 0 ? (
                              <div style={{ fontSize: '13px', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                                This user is not associated with any restaurants.
                              </div>
                            ) : (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '12px'
                              }}>
                                {(userRow.tenants || []).map((t, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid var(--border)',
                                      borderRadius: '8px',
                                      padding: '12px 16px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Link
                                        to={`/admin/companies/${t.slug}`}
                                        style={{ fontWeight: '700', fontSize: '14px', color: 'var(--primary-color)', textDecoration: 'none' }}
                                      >
                                        {t.name_en}
                                      </Link>
                                      <span className={`tenant-pill status-${t.status || 'active'}`} style={{ margin: 0 }}>
                                        {t.status || 'active'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                                      Slug: <strong style={{ color: 'var(--text)' }}>{t.slug}</strong>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
                                      Role: <strong style={{ color: 'var(--text)' }}>{t.role}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Promote / Demote Modal */}
      {superAdminModal.show && (
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
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text)' }}>
              Confirm Admin Status Toggle
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Are you sure you want to {superAdminModal.makeSuper ? 'promote' : 'revoke'} super admin access for{' '}
              <strong style={{ color: 'var(--text)' }}>{superAdminModal.email}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSuperAdminModal({ show: false, userId: null, email: '', makeSuper: false })}
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
                onClick={handleToggleSuperAdminConfirm}
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
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
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
              Delete User Account
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you absolutely sure you want to permanently delete the user{' '}
              <strong style={{ color: 'var(--text)' }}>{deleteModal.email}</strong>? This action cannot be undone and will cascade delete all associated restaurants, categories, and products.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
                TYPE USER EMAIL TO CONFIRM
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
                onClick={() => setDeleteModal({ show: false, userId: null, email: '', confirmEmailInput: '' })}
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
                onClick={handleDeleteUserConfirm}
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
