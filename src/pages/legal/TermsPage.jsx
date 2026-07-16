// v1 boilerplate — review with legal counsel before scaling beyond demo.
import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F5',
      color: '#111111',
      fontFamily: 'var(--font-en)',
      lineHeight: '1.6',
      padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
            &larr; Back to Home
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '16px 0 8px 0', color: 'var(--text)' }}>
            QriousQR — Terms of Service
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-soft)' }}>
            Last updated: July 13, 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '15px', color: 'var(--text)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ margin: 0 }}>
              By using QriousQR (the "Service"), you agree to these terms. If you don't agree, don't use the Service.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              2. What QriousQR is
            </h2>
            <p style={{ margin: 0 }}>
              QriousQR is a hosted QR-menu and diner-loyalty platform. Restaurants ("Tenants") publish menus and offer coupons; diners ("Customers") view menus and redeem coupons at participating Tenants.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              3. Accounts
            </h2>
            <p style={{ margin: 0 }}>
              You are responsible for keeping your login credentials confidential and for all activity under your account. Notify us immediately if you suspect unauthorized access. We may suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              4. Tenant Obligations
            </h2>
            <p style={{ margin: 0 }}>
              Tenants are solely responsible for the accuracy of menu information, prices, availability, allergen declarations, and coupon fulfillment. QriousQR is a tool; QriousQR does not sell food.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              5. Customer Obligations
            </h2>
            <p style={{ margin: 0 }}>
              Customers must provide accurate information at registration. Coupons are personal, non-transferable, and subject to the fair-use limits set by each Tenant and by QriousQR.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              6. Payments (not applicable at v1)
            </h2>
            <p style={{ margin: 0 }}>
              QriousQR does not currently process payments. All food payments happen directly between Customer and Tenant off-platform.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              7. Intellectual Property
            </h2>
            <p style={{ margin: 0 }}>
              The QriousQR platform, code, and design are owned by [YOUR COMPANY NAME]. Tenant content (menus, images, branding) remains the property of the respective Tenant.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              8. Disclaimers
            </h2>
            <p style={{ margin: 0 }}>
              The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              9. Limitation of Liability
            </h2>
            <p style={{ margin: 0 }}>
              To the fullest extent permitted by law, QriousQR is not liable for indirect, incidental, or consequential damages arising from Service use.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              10. Changes to Terms
            </h2>
            <p style={{ margin: 0 }}>
              We may update these terms. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              11. Governing Law
            </h2>
            <p style={{ margin: 0 }}>
              These terms are governed by the laws of [JURISDICTION].
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              12. Contact
            </h2>
            <p style={{ margin: 0 }}>
              Questions? <a href="mailto:hello@qriousqr.com" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>hello@qriousqr.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
