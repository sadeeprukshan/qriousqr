import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { COUNTRIES, dialForCountry } from '../lib/countries.js';
import { supabase, isMockMode } from '../supabaseClient.js';

const T = {
  en: {
    title: 'Customer Registration',
    sub: 'Join the QriousQR customer directory to get exclusive offers and updates.',
    firstName: 'First Name',
    lastName: 'Last Name',
    country: 'Country',
    phone: 'Phone Number',
    email: 'Email Address',
    gender: 'Gender',
    birthday: 'Birthday',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderNotsay: 'Prefer not to say',
    submit: 'Register',
    submitting: 'Registering...',
    emailTaken: 'That email is already registered.',
    phoneTaken: 'That phone number is already registered.',
    registerFailed: 'Registration failed. Please try again.',
    validationError: 'Please check your inputs and fill in all fields correctly.',
    phoneDigitsError: 'Phone number must contain between 6 and 15 digits.',
    passwordMismatch: 'Passwords do not match.',
    passwordLength: 'Password must be at least 8 characters.',
    successTitle: "Welcome, ",
    pinSubtitle: "This is your permanent QriousQR PIN. You'll say it to restaurant staff when you claim a coupon. Save it now.",
    copyPin: 'Copy PIN',
    copied: 'Copied!',
    viewRestaurants: 'View restaurants',
    signInNow: 'Sign in now',
    changeLang: 'العربية'
  },
  ar: {
    title: 'تسجيل العملاء',
    sub: 'انضم إلى دليل عملاء QriousQR للحصول على العروض الحصرية والتحديثات.',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    country: 'البلد',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    gender: 'الجنس',
    birthday: 'تاريخ الميلاد',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    genderOther: 'غير ذلك',
    genderNotsay: 'أفضل عدم الإفصاح',
    submit: 'تسجيل',
    submitting: 'جاري التسجيل...',
    emailTaken: 'هذا البريد الإلكتروني مسجل بالفعل.',
    phoneTaken: 'رقم الهاتف هذا مسجل بالفعل.',
    registerFailed: 'فشل التسجيل. يرجى المحاولة مرة أخرى.',
    validationError: 'يرجى التحقق من المدخلات وملء جميع الحقول بشكل صحيح.',
    phoneDigitsError: 'يجب أن يحتوي رقم الهاتف على ما بين 6 و 15 رقمًا.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    passwordLength: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
    successTitle: 'أهلاً بك، ',
    pinSubtitle: 'هذا هو رقم PIN الدائم الخاص بك في QriousQR. ستقوله لموظفي المطعم عند استخدام قسيمة الخصم. احفظه الآن.',
    copyPin: 'نسخ الرمز',
    copied: 'تم النسخ!',
    viewRestaurants: 'عرض المطاعم',
    signInNow: 'سجل دخولك الآن',
    changeLang: 'English'
  }
};

function generateMockCustomerPin(phoneFull) {
  const digitsOnly = phoneFull.replace(/\D/g, '');
  const last6 = digitsOnly.slice(-6).padStart(6, '0');
  
  const seqKey = 'qrious:mock_customer_pin_seq';
  let seq = parseInt(localStorage.getItem(seqKey) || '0', 10);
  const nextSeq = (seq + 1) % 1000;
  localStorage.setItem(seqKey, nextSeq.toString());
  
  const tail = seq.toString().padStart(3, '0');
  return `${last6}${tail}`;
}

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('LB');
  const [dialCode, setDialCode] = useState('+961');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const t = T[lang];
  const isRtl = lang === 'ar';
  const today = new Date().toISOString().split('T')[0];

  // Auto-update dial code when country changes
  useEffect(() => {
    const code = dialForCountry(country);
    if (code) {
      setDialCode(code);
    }
  }, [country]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');

    // Validation
    if (!trimmedFirst || !trimmedLast || !trimmedEmail || !cleanPhone || !birthday || !password || !confirmPassword) {
      setFormError(t.validationError);
      return;
    }

    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      setFormError(t.phoneDigitsError);
      return;
    }

    if (password.length < 8) {
      setFormError(t.passwordLength);
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t.passwordMismatch);
      return;
    }

    setLoading(true);

    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'c-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36),
      first_name: trimmedFirst,
      last_name: trimmedLast,
      country_code: country,
      phone_code: dialCode,
      phone: cleanPhone,
      email: trimmedEmail,
      gender,
      birthday,
      created_at: new Date().toISOString()
    };

    try {
      if (isMockMode) {
        // Persist to local storage mock database
        const rows = JSON.parse(localStorage.getItem('qriousqr:mock_customers') || '[]');
        const users = JSON.parse(localStorage.getItem('qriousqr:mock_customer_users') || '[]');
        
        // Uniqueness check
        if (rows.some(r => r.email === trimmedEmail) || users.some(r => r.email === trimmedEmail)) {
          setFormError(t.emailTaken);
          setLoading(false);
          return;
        }
        const fullPhone = dialCode + cleanPhone;
        if (rows.some(r => r.phone_code + r.phone === fullPhone) || users.some(r => r.phone_full === fullPhone)) {
          setFormError(t.phoneTaken);
          setLoading(false);
          return;
        }

        const mockUserPin = generateMockCustomerPin(fullPhone);
        const mockCustomer = {
          ...payload,
          user_pin: mockUserPin
        };
        
        rows.push(mockCustomer);
        users.push({
          ...mockCustomer,
          phone_full: fullPhone,
          password
        });
        
        localStorage.setItem('qriousqr:mock_customers', JSON.stringify(rows));
        localStorage.setItem('qriousqr:mock_customer_users', JSON.stringify(users));
        
        setSuccessData(mockCustomer);
        setSuccess(true);
      } else {
        // Sign up with Supabase auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/customer` }
        });
        if (authErr) {
          setFormError(authErr.message);
          setLoading(false);
          return;
        }

        // Register customer CRM data via RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc('register_customer', {
          p_first_name: trimmedFirst,
          p_last_name: trimmedLast,
          p_country_code: country,
          p_phone_code: dialCode,
          p_phone: cleanPhone,
          p_email: trimmedEmail,
          p_gender: gender,
          p_birthday: birthday
        });

        if (rpcErr) {
          const msg = rpcErr.message || '';
          if (msg.includes('email_taken')) {
            setFormError(t.emailTaken);
          } else if (msg.includes('phone_taken')) {
            setFormError(t.phoneTaken);
          } else {
            setFormError(rpcErr.message || t.registerFailed);
          }
        } else {
          setSuccessData(rpcData);
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error(err);
      setFormError(t.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  if (success && successData) {
    const rawPin = successData.user_pin || '';
    const formattedPin = rawPin.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

    const handleCopyPin = async () => {
      try {
        await navigator.clipboard.writeText(rawPin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <div style={{
        display: 'flex',
        height: '100vh',
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
          padding: '40px 24px',
          width: '100%',
          maxWidth: '460px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
          boxSizing: 'border-box',
          direction: isRtl ? 'rtl' : 'ltr'
        }}>
          {/* check-circle inline SVG */}
          <div style={{
            display: 'inline-flex',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: 'var(--primary-color)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text)' }}>
            {t.successTitle}{successData.first_name}
          </h2>

          {/* PIN Block */}
          <div style={{
            background: '#F9FAFB',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px 16px',
            margin: '0 0 24px 0',
            boxSizing: 'border-box'
          }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '4px',
              color: 'var(--text)',
              marginBottom: '16px'
            }}>
              {formattedPin}
            </div>

            <button
              onClick={handleCopyPin}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: copied ? '#DCFCE7' : '#FFFFFF',
                color: copied ? 'var(--primary-color)' : 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              <span>{copied ? t.copied : t.copyPin}</span>
            </button>
          </div>

          <p style={{ color: 'var(--text-soft)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
            {t.pinSubtitle}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate(`/customer/login?email=${encodeURIComponent(successData.email || email)}`)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-color)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {t.signInNow}
            </button>

            <button
              onClick={() => navigate('/customer')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {t.viewRestaurants}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FAF8F5',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      padding: '40px 16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        boxSizing: 'border-box',
        position: 'relative',
        direction: isRtl ? 'rtl' : 'ltr'
      }}>
        {/* Language Switcher */}
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

        {formError && (
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
            {formError}
          </div>
        )}

        {/* Two-column form layout */}
        <form onSubmit={handleSubmit} style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '20px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* First Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.firstName}
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
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

            {/* Last Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.lastName}
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* Country */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.country}
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.phone}
              </label>
              <div style={{
                display: 'flex',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: 'none',
                    borderRight: isRtl ? 'none' : '1px solid var(--border)',
                    borderLeft: isRtl ? '1px solid var(--border)' : 'none',
                    backgroundColor: '#F9FAFB',
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none',
                    width: '90px'
                  }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.dial}>
                      {c.dial}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  placeholder="70123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    fontSize: '13px',
                    flex: 1,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* Email Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.email}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            {/* Gender */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.gender}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <option value="male">{t.genderMale}</option>
                <option value="female">{t.genderFemale}</option>
                <option value="other">{t.genderOther}</option>
                <option value="prefer_not_to_say">{t.genderNotsay}</option>
              </select>
            </div>
          </div>

          {/* Birthday */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '330px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
              {t.birthday}
            </label>
            <input
              type="date"
              required
              max={today}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.password}
              </label>
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

            {/* Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                {t.confirmPassword}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
