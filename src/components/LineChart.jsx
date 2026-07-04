import React, { useState } from 'react';

export default function LineChart({ data = [], height = 220, color = '#FF5722' }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)' }}>
        No data available
      </div>
    );
  }

  const padding = { top: 25, right: 20, bottom: 30, left: 45 };
  const width = 500; // Fixed viewBox width, highly responsive
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const midVal = Math.round(maxVal / 2);

  const getX = (idx) => padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
  const getY = (val) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  // Build the path string for the line
  const linePoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' L ');
  const linePath = linePoints ? `M ${linePoints}` : '';

  // Build the filled area path
  const areaPath = linePoints 
    ? `${linePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`
    : '';

  // Generate X axis labels (at most 7 labels to avoid overcrowding)
  const labelInterval = Math.max(1, Math.ceil(data.length / 7));

  // Helper to format date labels nicely (e.g. "Jul 1" or "07-01")
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
        {/* Y Axis Gridlines */}
        <line x1={padding.left} y1={getY(0)} x2={width - padding.right} y2={getY(0)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding.left} y1={getY(midVal)} x2={width - padding.right} y2={getY(midVal)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={padding.left} y1={getY(maxVal)} x2={width - padding.right} y2={getY(maxVal)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Y Axis Labels */}
        <text x={padding.left - 10} y={getY(0) + 4} textAnchor="end" fontSize="11" fill="var(--text-soft)" fontWeight="600">0</text>
        <text x={padding.left - 10} y={getY(midVal) + 4} textAnchor="end" fontSize="11" fill="var(--text-soft)" fontWeight="600">{midVal}</text>
        <text x={padding.left - 10} y={getY(maxVal) + 4} textAnchor="end" fontSize="11" fill="var(--text-soft)" fontWeight="600">{maxVal}</text>

        {/* Filled Area */}
        {areaPath && (
          <path
            d={areaPath}
            fill={color}
            opacity="0.12"
          />
        )}

        {/* Line Path */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          const isSelectedLabel = i % labelInterval === 0 || i === data.length - 1;
          if (!isSelectedLabel) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-soft)"
              fontWeight="600"
            >
              {formatDate(d.label)}
            </text>
          );
        })}

        {/* Hover Highlight Vertical Line & Circle */}
        {hoveredIdx !== null && (
          <>
            <line
              x1={getX(hoveredIdx)}
              y1={padding.top}
              x2={getX(hoveredIdx)}
              y2={padding.top + chartHeight}
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <circle
              cx={getX(hoveredIdx)}
              cy={getY(data[hoveredIdx].value)}
              r="6"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
            />
          </>
        )}

        {/* Interactive Hover Intercept Zones */}
        {data.map((d, i) => {
          const colWidth = chartWidth / (data.length - 1 || 1);
          return (
            <rect
              key={i}
              x={getX(i) - colWidth / 2}
              y={padding.top}
              width={colWidth}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </svg>

      {/* HTML Tooltip overlay */}
      {hoveredIdx !== null && (
        <div style={{
          position: 'absolute',
          top: getY(data[hoveredIdx].value) - 48,
          left: `calc(${(getX(hoveredIdx) / width) * 100}% - 60px)`,
          width: '120px',
          background: 'var(--text)',
          color: 'var(--bg)',
          padding: '6px 10px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '11.5px',
          fontWeight: '600',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <div style={{ opacity: 0.85, fontSize: '10px', fontWeight: '500', marginBottom: '2px' }}>{formatDate(data[hoveredIdx].label)}</div>
          <div>{data[hoveredIdx].value} visits</div>
        </div>
      )}
    </div>
  );
}
