// v1 boilerplate — review with legal counsel before scaling beyond demo.
import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
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
            QriousQR — Privacy Policy
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-soft)' }}>
            Last updated: July 13, 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '15px', color: 'var(--text)' }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              1. What We Collect
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Account data: email, phone number, name (Tenant owners and Customers).</li>
              <li>Profile data: country, gender, date of birth (Customers).</li>
              <li>Loyalty data: coupon history, claim history at participating restaurants.</li>
              <li>Usage data: pages visited, clicks (aggregated).</li>
              <li>Communications: emails you send us.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              2. How We Use Your Data
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>To operate the Service (show menus, provision coupons, authorize claims).</li>
              <li>To communicate with you about your account and the Service.</li>
              <li>To improve the Service.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              3. Who We Share Your Data With
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Supabase (Australia region): our hosting and database provider.</li>
              <li>Resend (email service, planned): to send account and reminder emails.</li>
              <li>We do not sell your data. We do not share it with advertisers.</li>
              <li>Tenants see the personal data of Customers who redeem coupons at their restaurant (name, phone, email, redemption history) — this is required to fulfill the coupon.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              4. Data Retention
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Account data is kept while your account is active.</li>
              <li>You can request account deletion by emailing <a href="mailto:privacy@qriousqr.com" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>privacy@qriousqr.com</a>.</li>
              <li>Coupon claim history is retained for [12 months] for dispute resolution and Tenant reporting.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              5. Your Rights
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Access, correct, or delete your personal data by contacting <a href="mailto:privacy@qriousqr.com" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>privacy@qriousqr.com</a>.</li>
              <li>You can update most fields yourself from the profile screen.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              6. Cookies
            </h2>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>We use a small number of cookies to keep you signed in.</li>
              <li>We do not use third-party advertising cookies.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              7. Security
            </h2>
            <p style={{ margin: '0 0 10px 0' }}>
              Data is transmitted over HTTPS. Passwords are hashed (bcrypt). Row-level security enforces per-user data access at the database.
            </p>
            <p style={{ margin: 0 }}>
              No system is perfectly secure. Report suspected issues to <a href="mailto:security@qriousqr.com" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>security@qriousqr.com</a>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              8. Children
            </h2>
            <p style={{ margin: 0 }}>
              QriousQR is not directed at children under 13. Do not register children.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              9. Changes to This Policy
            </h2>
            <p style={{ margin: 0 }}>
              We may update this policy. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 10px 0', color: 'var(--text)' }}>
              10. Contact
            </h2>
            <p style={{ margin: 0 }}>
              <a href="mailto:privacy@qriousqr.com" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>privacy@qriousqr.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
