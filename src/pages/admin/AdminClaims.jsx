import React, { useState, useEffect } from 'react';
import { supabase, isMockMode } from '../../supabaseClient.js';

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [daysFilter, setDaysFilter] = useState(90);

  const loadAllClaims = async () => {
    setLoading(true);
    try {
      const dbStatus = statusFilter === 'All' ? null : statusFilter.toLowerCase();
      
      if (isMockMode) {
        // Load mock claims from localStorage
        const allClaims = JSON.parse(localStorage.getItem('qriousqr:mock_claims') || '[]');
        const filtered = allClaims
          .filter(c => {
            // Status filter
            if (dbStatus && c.status !== dbStatus) return false;
            // Days filter
            const created = new Date(c.created_at);
            const cutoff = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000);
            return created >= cutoff;
          })
          .map(c => ({
            claim_id: c.id,
            status: c.status,
            created_at: c.created_at,
            completed_at: c.authorized_at || null,
            category: c.category,
            year: 2026,
            customer_id: c.customer_id,
            customer_name: `${c.customer_first_name || 'Demo'} ${c.customer_last_name || 'Diner'}`,
            customer_email: c.customer_email || 'diner@qriousqr.local',
            customer_phone: '+96171234567',
            company_id: c.company_id || 'kantami-id',
            company_name: 'Kantami',
            company_slug: 'kantami'
          }));
        setClaims(filtered);
      } else {
        const { data, error } = await supabase.rpc('admin_all_claims', {
          p_days: parseInt(daysFilter),
          p_status: dbStatus
        });
        if (!error && data) {
          setClaims(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllClaims();
  }, [statusFilter, daysFilter]);

  const getStatusPillStyles = (status) => {
    switch (status) {
      case 'completed':
      case 'authorized':
        return { backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' };
      case 'pending':
        return { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
      case 'rejected':
        return { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' };
      default: // expired / cancelled
        return { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' };
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
            Coupon Claims
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-soft)' }}>
            Platform-wide coupon claim transactions logs.
          </p>
        </div>

        {/* Filters control block */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Status select */}
          <div className="company-select-wrapper" style={{ width: '150px' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="sidebar-company-select"
              style={{ padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
            <div className="select-arrow-indicator" style={{ top: '55%' }}>▼</div>
          </div>

          {/* Days select */}
          <div className="company-select-wrapper" style={{ width: '120px' }}>
            <select
              value={daysFilter}
              onChange={e => setDaysFilter(e.target.value)}
              className="sidebar-company-select"
              style={{ padding: '8px 12px', fontSize: '13px' }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={365}>Last Year</option>
            </select>
            <div className="select-arrow-indicator" style={{ top: '55%' }}>▼</div>
          </div>
        </div>
      </div>

      <div className="admin-table-card" style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--border)', color: 'var(--text-soft)', fontWeight: '700' }}>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Created</th>
              <th style={{ padding: '12px 16px' }}>Completed</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Customer</th>
              <th style={{ padding: '12px 16px' }}>Restaurant</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  Loading claims logs...
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-soft)' }}>
                  No claims match the filter criteria.
                </td>
              </tr>
            ) : (
              claims.map(c => {
                const createdStr = new Date(c.created_at).toLocaleString();
                const completedStr = c.completed_at ? new Date(c.completed_at).toLocaleString() : '—';
                const statusPill = getStatusPillStyles(c.status);

                return (
                  <tr key={c.claim_id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        ...statusPill
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>{createdStr}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>{completedStr}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{c.category?.replace('_', ' ')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{c.customer_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{c.customer_email || c.customer_phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{c.company_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-soft)' }}>/{c.company_slug}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {claims.length >= 200 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: '#FAF8F5', color: 'var(--text-soft)', fontSize: '11px', textAlign: 'center' }}>
            Showing latest 200 claims. Older records not currently browseable.
          </div>
        )}
      </div>
    </div>
  );
}
