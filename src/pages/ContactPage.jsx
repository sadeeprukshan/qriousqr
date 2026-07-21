import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QSuccessToast from '../components/QSuccessToast.jsx';
import './ContactPage.css';

export default function ContactPage() {
  // Form fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Field errors state (for inline hints)
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    message: ''
  });

  // Set page title on mount
  useEffect(() => {
    document.title = "Get a Quote · QriousQR";
  }, []);

  // Validate fields on change
  const handleFieldChange = (field, value, setter) => {
    setter(value);
    setErrorMsg(''); // Clear overall form error on change
    setErrors(prev => ({ ...prev, [field]: '' })); // Clear specific inline error
  };

  const validate = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', phone: '', companyName: '', message: '' };

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required.';
      isValid = false;
    } else if (name.length > 120) {
      newErrors.name = 'Name must be 120 characters or less.';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    } else if (email.length > 200) {
      newErrors.email = 'Email must be 200 characters or less.';
      isValid = false;
    }

    // Phone validation (optional)
    if (phone && phone.length > 40) {
      newErrors.phone = 'Phone number must be 40 characters or less.';
      isValid = false;
    }

    // Company validation (optional)
    if (companyName && companyName.length > 160) {
      newErrors.companyName = 'Company name must be 160 characters or less.';
      isValid = false;
    }

    // Message validation
    if (!message.trim() || message.length < 5) {
      newErrors.message = 'Message must be at least 5 characters.';
      isValid = false;
    } else if (message.length > 4000) {
      newErrors.message = 'Message must be 4000 characters or less.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-message`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company_name: companyName.trim() || null,
          message: message.trim(),
          website: website // honeypot
        }),
      });

      const json = await res.json().catch(() => ({}));
      
      if (!res.ok || !json.ok) {
        setErrorMsg('Something went wrong. Please try again or email hello@qriousqr.com directly.');
        return;
      }

      // Success
      setShowSuccessToast(true);
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setMessage('');
      setWebsite('');
      setErrors({ name: '', email: '', phone: '', companyName: '', message: '' });

    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong. Please try again or email hello@qriousqr.com directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page-wrapper">
      {/* Header / Nav */}
      <nav className="contact-nav">
        <div className="contact-nav-container">
          <Link to="/" className="contact-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h2v2H7z" />
              <path d="M7 15h2v2H7z" />
              <path d="M15 7h2v2h-2z" />
              <path d="M15 15h2v2h-2z" />
            </svg>
            <span>QRious</span>
          </Link>
          <Link to="/" className="contact-nav-back">← Back to Home</Link>
        </div>
      </nav>

      {/* Main Body Grid */}
      <main className="contact-main">
        <div className="contact-grid">
          {/* Left Column: Get In Touch */}
          <div className="contact-info-col">
            <span className="contact-badge">GET IN TOUCH</span>
            <h1>Get a quote</h1>
            <p className="contact-subhead">
              Tell us about your restaurant and we'll get back to you within 24 hours.
            </p>

            <div className="contact-card-info">
              <div className="contact-info-item">
                <span className="info-icon">✉</span>
                <div>
                  <div className="info-label">Email us</div>
                  <a href="mailto:hello@qriousqr.com" className="info-value">hello@qriousqr.com</a>
                </div>
              </div>
              
              <div className="contact-info-item">
                <span className="info-icon">📍</span>
                <div>
                  <div className="info-label">Regions</div>
                  <div className="info-value text-muted">Beirut · Riyadh · Dubai</div>
                </div>
              </div>

              <div className="contact-info-item">
                <span className="info-icon">⏱</span>
                <div>
                  <div className="info-label">Response time</div>
                  <div className="info-value text-muted">Typically responds within 24h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div className="contact-form-col">
            <div className="contact-form-card">
              {errorMsg && (
                <div className="contact-form-alert error">
                  <span>⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Honeypot field (hidden from users) */}
                <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group-field">
                    <label htmlFor="name">Name *</label>
                    <input
                      id="name"
                      type="text"
                      maxLength={120}
                      value={name}
                      onChange={(e) => handleFieldChange('name', e.target.value, setName)}
                      placeholder="Your full name"
                      className={errors.name ? 'error-input' : ''}
                      required
                    />
                    {errors.name && <span className="field-error-hint">{errors.name}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-field">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      maxLength={200}
                      value={email}
                      onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                      placeholder="e.g. name@restaurant.com"
                      className={errors.email ? 'error-input' : ''}
                      required
                    />
                    {errors.email && <span className="field-error-hint">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row split">
                  <div className="form-group-field">
                    <label htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      type="tel"
                      maxLength={40}
                      value={phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value, setPhone)}
                      placeholder="e.g. +96171234567"
                      className={errors.phone ? 'error-input' : ''}
                    />
                    {errors.phone && <span className="field-error-hint">{errors.phone}</span>}
                  </div>

                  <div className="form-group-field">
                    <label htmlFor="company">Restaurant name</label>
                    <input
                      id="company"
                      type="text"
                      maxLength={160}
                      value={companyName}
                      onChange={(e) => handleFieldChange('companyName', e.target.value, setCompanyName)}
                      placeholder="e.g. Dolcetto Bakery"
                      className={errors.companyName ? 'error-input' : ''}
                    />
                    {errors.companyName && <span className="field-error-hint">{errors.companyName}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-field" style={{ position: 'relative' }}>
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      rows={6}
                      maxLength={4000}
                      value={message}
                      onChange={(e) => handleFieldChange('message', e.target.value, setMessage)}
                      placeholder="Tell us about your restaurant, locations, estimated menu size..."
                      className={errors.message ? 'error-input' : ''}
                      required
                    />
                    <div className="textarea-footer">
                      {errors.message ? (
                        <span className="field-error-hint">{errors.message}</span>
                      ) : (
                        <div></div>
                      )}
                      <span className="char-counter">{message.length} / 4000</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-contact-submit"
                >
                  {submitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <QSuccessToast
        message="Message sent — we'll be in touch within 24 hours."
        visible={showSuccessToast}
        onDismiss={() => setShowSuccessToast(false)}
      />
    </div>
  );
}
