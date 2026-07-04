import React from 'react';

export default function BarChart({ data = [], color = '#FF5722' }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-soft)' }}>
        No product clicks yet.
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.map((item, idx) => {
        const percentage = Math.round((item.count / maxVal) * 100);
        const name = item.name_en || 'Unknown Product';
        const initial = name.charAt(0).toUpperCase();

        return (
          <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {/* 48px round product image */}
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt="" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} 
              />
            ) : (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '15px',
                flexShrink: 0,
                border: '1px solid var(--border)'
              }}>
                {initial}
              </div>
            )}
            
            {/* Product Name */}
            <div style={{ width: '120px', minWidth: '120px', fontSize: '13.5px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
              {name}
            </div>

            {/* SVG Bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <svg width="100%" height="8" style={{ display: 'block', overflow: 'visible' }}>
                <rect 
                  width="100%" 
                  height="8" 
                  rx="4" 
                  fill="var(--surface-2)" 
                />
                <rect 
                  width={`${percentage}%`} 
                  height="8" 
                  rx="4" 
                  fill={color} 
                  style={{ transition: 'width 0.8s ease-out' }}
                />
              </svg>
            </div>

            {/* Count */}
            <div style={{ width: '40px', fontSize: '13px', fontWeight: '700', color: 'var(--text-soft)', flexShrink: 0, textAlign: 'right' }}>
              {item.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
