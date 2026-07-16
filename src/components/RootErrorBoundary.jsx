import React from 'react';

export default class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Kept for production observability; Sentry integration later.
    console.error('RootErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 20px',
          backgroundColor: '#FAF8F5',
          color: '#111111',
          fontFamily: 'var(--font-en, system-ui, sans-serif)',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
            Something went wrong.
          </h1>
          <p style={{ maxWidth: '480px', color: '#666', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
            The app hit an unexpected error. Reloading usually fixes it. If it keeps happening, email us at <a href="mailto:hello@qriousqr.com" style={{ color: '#FF5722' }}>hello@qriousqr.com</a>.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 28px',
              border: 'none',
              borderRadius: '999px',
              background: '#FF5722',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
