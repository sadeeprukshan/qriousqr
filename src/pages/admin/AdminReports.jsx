import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminDashboardStats, adminSignupsByDay, adminTopMenus, adminTopProducts } from '../../services/adminService.js';
import LineChart from '../../components/LineChart.jsx';

export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [signups, setSignups] = useState([]);
  const [topMenus, setTopMenus] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [statsRes, signupsRes, menusRes, productsRes] = await Promise.all([
        adminDashboardStats(),
        adminSignupsByDay(days),
        adminTopMenus(10),
        adminTopProducts(10)
      ]);
      setStats(statsRes);
      setSignups(signupsRes);
      setTopMenus(menusRes);
      setTopProducts(productsRes);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (selectedDays) => {
    setChartLoading(true);
    try {
      const res = await adminSignupsByDay(selectedDays);
      setSignups(res);
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleDaysChange = (newDays) => {
    setDays(newDays);
    loadChartData(newDays);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', fontFamily: 'var(--font-en)' }}>
        <h3 style={{ color: 'var(--text-soft)' }}>Generating reports and loading analytics...</h3>
      </div>
    );
  }

  // Map signups data to LineChart expected format
  const chartData = signups.map(s => ({
    label: s.day,
    value: s.count
  }));

  // Max values for horizontal bar charts
  const maxVisits = topMenus.length > 0 ? Math.max(...topMenus.map(m => m.visits || 0), 1) : 1;
  const maxClicks = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.clicks || 0), 1) : 1;

  return (
    <div style={{ paddingBottom: '80px', fontFamily: 'var(--font-en)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text)' }}>Platform Reports</h1>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '14px' }}>
            Overview of sign-ups, menu scans, and active user metrics.
          </p>
        </div>
        <button
          onClick={loadAllData}
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
          Refresh All Data
        </button>
      </div>

      {errorMsg && (
        <div style={{
          padding: '16px 20px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          color: '#991B1B',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Grid of 6 stats cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {/* Total Users */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Total Users
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.total_users || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            {stats?.super_admins || 0} super admin{stats?.super_admins === 1 ? '' : 's'}
          </div>
        </div>

        {/* Total Tenants */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Total Restaurants
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.total_tenants || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            {stats?.active || 0} active / {stats?.total_tenants || 0} total
          </div>
        </div>

        {/* Pending Approval (Highlighted amber if > 0) */}
        <div style={{
          backgroundColor: (stats?.pending || 0) > 0 ? '#FFFBEB' : '#FFFFFF',
          border: (stats?.pending || 0) > 0 ? '1px solid #FCD34D' : '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
          transition: 'all 0.2s'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '700',
            color: (stats?.pending || 0) > 0 ? '#B45309' : 'var(--text-soft)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px'
          }}>
            Pending Approval
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '800',
            color: (stats?.pending || 0) > 0 ? '#D97706' : 'var(--text)',
            marginBottom: '4px'
          }}>
            {stats?.pending || 0}
          </div>
          <div style={{ fontSize: '12px', color: (stats?.pending || 0) > 0 ? '#78350F' : 'var(--text-soft)' }}>
            Needs platform review
          </div>
        </div>

        {/* Total Menu Items */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Menu Items
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.total_products || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            Across {stats?.total_categories || 0} categories
          </div>
        </div>

        {/* Visits (30d) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Visits (30d)
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.visits_30d || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            Scans from QR codes
          </div>
        </div>

        {/* Product Clicks (30d) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Clicks (30d)
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
            {stats?.clicks_30d || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>
            Diner item interactions
          </div>
        </div>
      </div>

      {/* Middle: Signups Chart */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text)' }}>
            New Sign-ups — Last {days} Days
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
            {[7, 30, 90].map(val => (
              <button
                key={val}
                onClick={() => handleDaysChange(val)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: days === val ? '#FFFFFF' : 'transparent',
                  color: days === val ? 'var(--text)' : 'var(--text-soft)',
                  boxShadow: days === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {val}d
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {chartLoading && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <span style={{ fontWeight: '600', color: 'var(--text-soft)' }}>Loading...</span>
            </div>
          )}
          
          {chartData.length === 0 ? (
            <div style={{
              height: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-soft)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
              <div style={{ fontWeight: '700', color: 'var(--text)' }}>No sign-ups recorded yet</div>
              <div style={{ fontSize: '12px' }}>Users appear on this graph after creating accounts.</div>
            </div>
          ) : (
            <LineChart data={chartData} height={240} color="var(--primary-color)" />
          )}
        </div>
      </div>

      {/* Bottom two side-by-side cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {/* Top Menus */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text)' }}>
            Top Menus (visits, 30d)
          </h2>
          
          {topMenus.length === 0 ? (
            <div style={{
              height: '240px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-soft)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontWeight: '700', color: 'var(--text)' }}>No visits recorded yet</div>
              <div style={{ fontSize: '12px', textAlign: 'center' }}>Data appears here once diners scan menus.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topMenus.map((item, idx) => {
                const percentage = Math.min(100, Math.round((item.visits / maxVisits) * 100));
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <Link
                        to={`/admin/companies/${item.company_id}`}
                        style={{ fontWeight: '700', color: 'var(--primary-color)', textDecoration: 'none' }}
                      >
                        {item.name_en} <span style={{ color: 'var(--text-soft)', fontWeight: 'normal' }}>({item.slug})</span>
                      </Link>
                      <strong style={{ color: 'var(--text)' }}>{item.visits} visit{item.visits === 1 ? '' : 's'}</strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary-color)', borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text)' }}>
            Top Products (clicks, 30d)
          </h2>
          
          {topProducts.length === 0 ? (
            <div style={{
              height: '240px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-soft)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍔</div>
              <div style={{ fontWeight: '700', color: 'var(--text)' }}>No clicks recorded yet</div>
              <div style={{ fontSize: '12px', textAlign: 'center' }}>Data appears here once diners interact with menu items.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topProducts.map((item, idx) => {
                const percentage = Math.min(100, Math.round((item.clicks / maxClicks) * 100));
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>
                        {item.name_en} <span style={{ color: 'var(--text-soft)', fontWeight: 'normal' }}>({item.company_slug})</span>
                      </span>
                      <strong style={{ color: 'var(--text)' }}>{item.clicks} click{item.clicks === 1 ? '' : 's'}</strong>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#0EA5E9', borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
