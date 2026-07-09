import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';

const T = {
  en: {
    title: 'Customer Login',
    sub: 'Sign in to access your coupons and restaurant directory.',
    identifierLabel: 'Email or phone number',
    passwordLabel: 'Password',
    submit: 'Sign In',
    signingIn: 'Signing in...',
    wrongCredentials: 'Wrong credentials. Please check your email/phone and password.',
    noCustomerFound: "We couldn't find a customer with that phone number.",
    newHere: 'New here? Create a customer account →',
    forgotPassword: 'Forgot password?',
    changeLang: 'العربية'
  },
  ar: {
    title: 'تسجيل دخول العملاء',
    sub: 'سجل الدخول للوصول إلى قسائم الخصم ودليل المطاعم الخاصة بك.',
    identifierLabel: 'البريد الإلكتروني أو رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    signingIn: 'جاري تسجيل الدخول...',
    wrongCredentials: 'بيانات الاعتماد خاطئة. يرجى التحقق من البريد/الهاتف وكلمة المرور.',
    noCustomerFound: 'لم نتمكن من العثور على عميل برقم الهاتف هذا.',
    newHere: 'جديد هنا؟ إنشاء حساب عميل →',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    changeLang: 'English'
  }
};

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkCustomerStatus } = useAuth();

  const [lang, setLang] = useState('en');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = T[lang];
  const isRtl = lang === 'ar';

  // Seed default mock customer if in mock mode
  useEffect(() => {
    if (isMockMode) {
      const users = JSON.parse(localStorage.getItem('qriousqr:mock_customer_users') || '[]');
      const exists = users.some(u => u.email === 'diner@qriousqr.local');
      if (!exists) {
        const defaultCustomer = {
          id: 'mock-diner',
          first_name: 'John',
          last_name: 'Doe',
          country_code: 'LB',
          phone_code: '+961',
          phone: '71234567',
          phone_full: '+96171234567',
          email: 'diner@qriousqr.local',
          password: 'demo1234',
          gender: 'male',
          birthday: '1995-01-01',
          user_pin: '234567000',
          created_at: new Date().toISOString()
        };
        users.push(defaultCustomer);
        localStorage.setItem('qriousqr:mock_customer_users', JSON.stringify(users));

        // Also seed the admin listing copy
        const customers = JSON.parse(localStorage.getItem('qriousqr:mock_customers') || '[]');
        if (!customers.some(c => c.email === 'diner@qriousqr.local')) {
          customers.push(defaultCustomer);
          localStorage.setItem('qriousqr:mock_customers', JSON.stringify(customers));
        }
      }
    }
  }, []);

  // Prefill email query param
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setIdentifier(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const raw = identifier.trim();
    if (!raw || !password) return;

    setLoading(true);
    let emailToUse = raw;

    try {
      if (isMockMode) {
        // Mock authentication
        const users = JSON.parse(localStorage.getItem('qriousqr:mock_customer_users') || '[]');
        let found = null;

        if (raw.includes('@')) {
          found = users.find(u => u.email.toLowerCase() === raw.toLowerCase());
        } else {
          // Normalize phone number
          const normalized = '+' + raw.replace(/[^\d]/g, '');
          found = users.find(u => u.phone_full === normalized);
          if (!found) {
            setErrorMsg(t.noCustomerFound);
            setLoading(false);
            return;
          }
        }

        if (!found || found.password !== password) {
          setErrorMsg(t.wrongCredentials);
          setLoading(false);
          return;
        }

        // Setup mock customer session
        const mockCustomerSession = {
          user: {
            id: found.id,
            email: found.email,
            first_name: found.first_name,
            last_name: found.last_name,
            user_pin: found.user_pin,
            isCustomer: true
          }
        };

        localStorage.setItem('qriousqr:mock_customer_session', JSON.stringify(mockCustomerSession));
        localStorage.setItem('qrious:session', JSON.stringify(mockCustomerSession));

        // Reload window to let AuthProvider pick up new mock session
        window.location.href = '/customer';
      } else {
        // Live Supabase Authentication
        if (!raw.includes('@')) {
          const normalized = '+' + raw.replace(/[^\d]/g, '');
          const { data, error: phoneErr } = await supabase.rpc('customer_email_by_phone', { p_phone_full: normalized });
          if (phoneErr || !data) {
            setErrorMsg(t.noCustomerFound);
            setLoading(false);
            return;
          }
          emailToUse = data;
        }

        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password
        });

        if (signInErr) {
          setErrorMsg(t.wrongCredentials);
          setLoading(false);
          return;
        }

        // Verify that they are registered as customer
        const isCustomer = await checkCustomerStatus(data.user);
        if (!isCustomer) {
          setErrorMsg(t.wrongCredentials);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        navigate('/customer', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.wrongCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FAF8F5',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        boxSizing: 'border-box',
        position: 'relative',
        direction: isRtl ? 'rtl' : 'ltr'
      }}>
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          style={{
            position: 'absolute',
            top: '24px',
            right: isRtl ? 'auto' : '24px',
            left: isRtl ? '24px' : 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--primary-color)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {t.changeLang}
        </button>

        {/* Title */}
        <div style={{ marginBottom: '32px', textAlign: isRtl ? 'right' : 'left' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text)' }}>
            {t.title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-soft)', margin: 0, lineHeight: '1.5' }}>
            {t.sub}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '13px',
            marginBottom: '24px',
            textAlign: isRtl ? 'right' : 'left'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identifier Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
              {t.identifierLabel}
            </label>
            <input
              type="text"
              required
              placeholder={isRtl ? 'diner@qriousqr.local أو 96171234567+' : 'diner@qriousqr.local or +96171234567'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box',
                width: '100%',
                direction: 'ltr',
                textAlign: isRtl ? 'right' : 'left'
              }}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.passwordLabel}
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box',
                width: '100%'
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-color)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginTop: '10px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? t.signingIn : t.submit}
          </button>

          {/* Links */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '13px'
          }}>
            <Link
              to="/customer/register"
              style={{
                color: 'var(--primary-color)',
                textDecoration: 'none',
                fontWeight: '700'
              }}
            >
              {t.newHere}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
