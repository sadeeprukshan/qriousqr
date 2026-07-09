import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <Link to="/" className="landing-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h2v2H7z" />
              <path d="M7 15h2v2H7z" />
              <path d="M15 7h2v2h-2z" />
              <path d="M15 15h2v2h-2z" />
            </svg>
            <span>QRious</span>
          </Link>
          
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <Link to="/menu/kantami">Live Demo</Link>
            <Link to="/customer/register" style={{ fontSize: '13px', color: 'var(--text-soft)', marginRight: '16px', textDecoration: 'none', fontWeight: '500' }}>Join as Customer</Link>
            <Link to="/auth" className="btn-link">Sign In</Link>
            <Link to="/auth?mode=register" className="btn-primary-landing">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-container">
          <div className="landing-hero-content">
            <span className="badge-landing">Next-Gen Restaurant Tech</span>
            <h1 className="hero-title">
              Beautiful QR menus your guests will <span className="highlight-text">actually use</span>
            </h1>
            <p className="hero-subhead">
              Ditch PDF menus. Give your guests an interactive, blazing-fast, bilingual menu with instant filtering, real-time pricing, and stunning aesthetics.
            </p>
            <div className="hero-ctas">
              <Link to="/auth?mode=register" className="btn-hero-primary">Create Your Menu</Link>
              <Link to="/menu/kantami" className="btn-hero-secondary">View Live Demo</Link>
            </div>
          </div>

          <div className="landing-hero-preview">
            <div className="phone-mockup">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <iframe 
                  src="/menu/kantami" 
                  title="Live Demo Preview"
                  className="preview-iframe"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="landing-features">
        <div className="section-header">
          <h2 className="section-title-landing">Features designed for modern hospitality</h2>
          <p className="section-subtitle-landing">Everything you need to run a professional, multi-lingual digital menu.</p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 8 6 6 6-6" />
                <path d="m4 14 6-6 8 8" />
              </svg>
            </div>
            <h3>Bilingual Menu (EN/AR)</h3>
            <p>Seamless toggle between English and Arabic layouts. Built-in RTL design for authentic Arabic reading experience.</p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" />
              </svg>
            </div>
            <h3>Custom Brand Colors</h3>
            <p>Pick a theme color that fits your restaurant. Your menu's accents, category tabs, and buttons adapt automatically.</p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3>Real-Time Analytics</h3>
            <p>Track visitor counts and product clicks directly from your admin panel. Spot your best-selling dishes instantly.</p>
          </div>

          {/* Card 4 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3>Multi-Currency Support</h3>
            <p>Localize pricing for your region. Formats automatically in LBP, AED, SAR, USD, and more with proper locales.</p>
          </div>

          {/* Card 5 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1" />
                <rect width="5" height="5" x="16" y="3" rx="1" />
                <rect width="5" height="5" x="3" y="16" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                <path d="M21 21v-3" />
                <path d="M12 12h.01" />
              </svg>
            </div>
            <h3>QR per Branch</h3>
            <p>Generate clean vectors or downloadable codes that redirect users directly to your menu page.</p>
          </div>

          {/* Card 6 */}
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            </div>
            <h3>Mobile-First Layout</h3>
            <p>Designed specifically to load instantly on guest smartphones. No downloads or installations required.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-how">
        <div className="section-header">
          <h2 className="section-title-landing">Get live in three simple steps</h2>
          <p className="section-subtitle-landing">You don't need coding skills to launch your restaurant's digital page.</p>
        </div>

        <div className="how-steps">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3>Sign Up Free</h3>
            <p>Create an account, pick your restaurant name, and auto-generate your clean menu URL slug.</p>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <h3>Build Your Menu</h3>
            <p>Add categories and list your dishes with descriptions, prices, calorie counts, and appetizing images.</p>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <h3>Share Your QR</h3>
            <p>Place your unique menu URL or QR code at your tables and let customers scan to enjoy.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <p>&copy; {new Date().getFullYear()} QRious. All rights reserved.</p>
          <div className="footer-links">
            <Link to="/auth">Owner Login</Link>
            <Link to="/menu/kantami">Demo Menu</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
