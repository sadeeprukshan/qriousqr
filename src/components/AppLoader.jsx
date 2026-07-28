import React from 'react';

export default function AppLoader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FAF8F5',
      zIndex: 99999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div className="app-loader-spinner" style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 87, 34, 0.1)',
        borderTop: '3px solid #FF5722',
        borderRadius: '50%',
        animation: 'app-loader-spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes app-loader-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
