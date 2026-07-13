import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COUNTRIES, dialForCountry } from '../lib/countries.js';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';

const T = {
  en: {
    title: 'My Profile',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone Number',
    phoneCode: 'Code',
    email: 'Email Address',
    dob: 'Date of Birth',
    country: 'Country',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderPlaceholder: '— Select —',
    genderRequiredHint: 'Gender is required',
    pinTitle: 'My QriousQR PIN',
    pinSub: 'Show this 9-digit PIN to the waiter to redeem a coupon.',
    copied: 'Copied!',
    copy: 'Copy',
    save: 'Save Changes',
    cancel: 'Cancel',
    signOut: 'Sign Out',
    loading: 'Loading profile...',
    requiredHint: 'This field is required',
    digitsOnlyHint: 'Digits only',
    futureDobHint: 'Please enter a valid birthday',
    changeEmail: 'Change email',
    emailModalTitle: 'Change Email Address',
    newEmailLabel: 'New Email Address',
    sendVerification: 'Send verification link',
    verificationSent: 'Check your inbox for a verification link. Your email will update once you confirm.',
    close: 'Close',
    toastSuccess: 'Profile updated',
    toastError: 'Failed to update profile',
    emailChangeNote: 'After you confirm, your email may take a few minutes to appear here.'
  },
  ar: {
    title: 'حسابي',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    phone: 'رقم الهاتف',
    phoneCode: 'الرمز',
    email: 'البريد الإلكتروني',
    dob: 'تاريخ الميلاد',
    country: 'البلد',
    gender: 'الجنس',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    genderPlaceholder: '— اختر —',
    genderRequiredHint: 'الجنس مطلوب',
    pinTitle: 'رمز QriousQR الخاص بي',
    pinSub: 'أظهر هذا الرمز المكون من ٩ أرقام للنادل لاسترداد القسيمة.',
    copied: 'تم النسخ!',
    copy: 'نسخ',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    signOut: 'تسجيل الخروج',
    loading: 'جاري تحميل الملف الشخصي...',
    requiredHint: 'هذا الحقل مطلوب',
    digitsOnlyHint: 'أرقام فقط',
    futureDobHint: 'يرجى إدخال تاريخ ميلاد صحيح',
    changeEmail: 'تغيير البريد',
    emailModalTitle: 'تغيير البريد الإلكتروني',
    newEmailLabel: 'البريد الإلكتروني الجديد',
    sendVerification: 'إرسال رابط التحقق',
    verificationSent: 'تحقق من صندوق الوارد الخاص بك للحصول على رابط التحقق. سيتم تحديث بريدك الإلكتروني بمجرد التأكيد.',
    close: 'إغلاق',
    toastSuccess: 'تم تحديث الملف الشخصي',
    toastError: 'فشل تحديث الملف الشخصي',
    emailChangeNote: 'بعد التأكيد، قد يستغرق ظهور بريدك الإلكتروني الجديد هنا بضع دقائق.'
  }
};

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [genderTouched, setGenderTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Form states
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birthday: '',
    gender: '',
    country_code: 'LB',
    phone_code: '+961',
    phone: ''
  });
  const [initialForm, setInitialForm] = useState(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const t = T[lang];
  const isRtl = lang === 'ar';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const loadProfile = async () => {
    try {
      if (isMockMode) {
        const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
        if (session?.user) {
          const user = session.user;
          setProfile(user);
          
          const initialData = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            birthday: user.birthday || '',
            gender: (user.gender === 'male' || user.gender === 'female') ? user.gender : '',
            country_code: user.country_code || 'LB',
            phone_code: user.phone_code || '+961',
            phone: user.phone || ''
          };
          setForm(initialData);
          setInitialForm(initialData);
        }
      } else {
        const { data, error } = await supabase.rpc('customer_me');
        if (!error && data) {
          const user = Array.isArray(data) ? data[0] : data;
          setProfile(user);
          
          const initialData = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            birthday: user.birthday || '',
            gender: (user.gender === 'male' || user.gender === 'female') ? user.gender : '',
            country_code: user.country_code || 'LB',
            phone_code: user.phone_code || '+961',
            phone: user.phone || ''
          };
          setForm(initialData);
          setInitialForm(initialData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleCopyPin = async () => {
    if (!profile?.user_pin) return;
    try {
      await navigator.clipboard.writeText(profile.user_pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(`/customer/login?lang=${lang}`);
  };

  const handleCountryChange = (code) => {
    const dial = dialForCountry(code);
    setForm(prev => ({
      ...prev,
      country_code: code,
      phone_code: dial || prev.phone_code
    }));
  };

  // Validations
  const errors = {
    first_name: !form.first_name.trim() ? t.requiredHint : '',
    last_name: !form.last_name.trim() ? t.requiredHint : '',
    phone: !form.phone.trim() 
      ? t.requiredHint 
      : (!/^[0-9]+$/.test(form.phone) ? t.digitsOnlyHint : ''),
    birthday: form.birthday && new Date(form.birthday) > new Date() ? t.futureDobHint : '',
    gender: ((genderTouched || submitAttempted) && (form.gender !== 'male' && form.gender !== 'female')) ? t.genderRequiredHint : ''
  };

  const isValid = !errors.first_name && !errors.last_name && !errors.phone && !errors.birthday && (form.gender === 'male' || form.gender === 'female');
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isValid || !isDirty) return;

    try {
      if (isMockMode) {
        // Save mock profile in localStorage
        const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
        if (session.user) {
          const updatedUser = {
            ...session.user,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
            birthday: form.birthday || null,
            gender: form.gender || null,
            country_code: form.country_code,
            phone_code: form.phone_code,
            phone: form.phone
          };
          session.user = updatedUser;
          localStorage.setItem('qriousqr:mock_customer_session', JSON.stringify(session));

          // Also update in mock users list
          const mockUsers = JSON.parse(localStorage.getItem('qriousqr:mock_users') || '[]');
          const userIdx = mockUsers.findIndex(u => u.email === updatedUser.email);
          if (userIdx !== -1) {
            mockUsers[userIdx] = { ...mockUsers[userIdx], ...updatedUser };
            localStorage.setItem('qriousqr:mock_users', JSON.stringify(mockUsers));
          }

          showToast(t.toastSuccess);
          await loadProfile();
        }
      } else {
        const { error } = await supabase.rpc('update_customer_profile', {
          p_first_name: form.first_name.trim(),
          p_last_name: form.last_name.trim(),
          p_birthday: form.birthday || null,
          p_gender: form.gender || null,
          p_country_code: form.country_code,
          p_phone_code: form.phone_code,
          p_phone: form.phone
        });

        if (error) {
          showToast(error.message || t.toastError, 'error');
        } else {
          showToast(t.toastSuccess);
          await loadProfile();
        }
      }
    } catch (err) {
      console.error(err);
      showToast(t.toastError, 'error');
    }
  };

  const handleCancel = () => {
    if (initialForm) {
      setForm(initialForm);
    }
  };

  const handleSendVerification = async (e) => {
    e.preventDefault();
    setEmailMessage('');
    if (!newEmail.trim()) return;

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        setEmailMessage(error.message);
      } else {
        setEmailMessage(t.verificationSent);
        setNewEmail('');
      }
    } catch (err) {
      console.error(err);
      setEmailMessage('An error occurred. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-en)' }}>
        <h3>{t.loading}</h3>
      </div>
    );
  }

  const initials = profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : '?';
  const formattedPin = profile?.user_pin 
    ? profile.user_pin.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
    : '--- --- ---';

  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '24px 16px 40px 16px',
      boxSizing: 'border-box',
      direction: isRtl ? 'rtl' : 'ltr',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)',
      textAlign: isRtl ? 'right' : 'left'
    }}>
      {/* Toast Notification */}
      {toast.message && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? '#EF4444' : '#22C55E',
          color: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontWeight: '700',
          fontSize: '14px',
          textAlign: 'center',
          minWidth: '220px'
        }}>
          {toast.message}
        </div>
      )}

      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 24px 0', color: 'var(--text)' }}>
        {t.title}
      </h2>

      {/* Main Form Card */}
      <form onSubmit={handleSave} style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Avatar circle */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-color, #FF5722)',
            color: '#FFFFFF',
            fontSize: '28px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            boxShadow: '0 4px 12px rgba(255,87,34,0.2)'
          }}>
            {initials}
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
            {profile?.full_name}
          </h3>
        </div>

        {/* Form Inputs */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
              {t.firstName} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={form.first_name}
              onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.first_name ? '1px solid #EF4444' : '1px solid var(--border)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
            {errors.first_name && (
              <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>{errors.first_name}</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
              {t.lastName} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={form.last_name}
              onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.last_name ? '1px solid #EF4444' : '1px solid var(--border)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
            {errors.last_name && (
              <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>{errors.last_name}</span>
            )}
          </div>
        </div>

        {/* Read-only Email Field with Modal popup trigger */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase' }}>
              {t.email}
            </label>
            <button
              type="button"
              onClick={() => {
                setEmailMessage('');
                setNewEmail('');
                setEmailModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color, #FF5722)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {t.changeEmail}
            </button>
          </div>
          <input
            type="text"
            readOnly
            disabled
            value={profile?.email || ''}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#F3F4F6',
              color: 'var(--text-soft)',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: '14px',
              cursor: 'not-allowed'
            }}
          />
        </div>

        {/* Gender Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            {t.gender} <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div className="company-select-wrapper" style={{ width: '100%', position: 'relative' }}>
            <select
              value={form.gender}
              onChange={e => {
                setForm(prev => ({ ...prev, gender: e.target.value }));
                setGenderTouched(true);
              }}
              onBlur={() => setGenderTouched(true)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.gender ? '1px solid #EF4444' : '1px solid var(--border)',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              <option value="">{t.genderPlaceholder}</option>
              <option value="male">{t.genderMale}</option>
              <option value="female">{t.genderFemale}</option>
            </select>
            <div className="select-arrow-indicator" style={{ top: '50%', right: isRtl ? 'auto' : '15px', left: isRtl ? '15px' : 'auto' }}>▼</div>
          </div>
          {errors.gender && (
            <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>{errors.gender}</span>
          )}
        </div>

        {/* Birthday Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            {t.dob}
          </label>
          <input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={form.birthday || ''}
            onChange={e => setForm(prev => ({ ...prev, birthday: e.target.value }))}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: errors.birthday ? '1px solid #EF4444' : '1px solid var(--border)',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: '14px',
              backgroundColor: '#FFFFFF'
            }}
          />
          {errors.birthday && (
            <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>{errors.birthday}</span>
          )}
        </div>

        {/* Country Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            {t.country} <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div className="company-select-wrapper" style={{ width: '100%', position: 'relative' }}>
            <select
              value={form.country_code}
              onChange={e => handleCountryChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <div className="select-arrow-indicator" style={{ top: '50%', right: isRtl ? 'auto' : '15px', left: isRtl ? '15px' : 'auto' }}>▼</div>
          </div>
        </div>

        {/* Phone details row */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            {t.phone} <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Phone Code input */}
            <input
              type="text"
              required
              value={form.phone_code}
              onChange={e => setForm(prev => ({ ...prev, phone_code: e.target.value }))}
              placeholder="+961"
              style={{
                width: '75px',
                padding: '10px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px',
                textAlign: 'center'
              }}
            />
            {/* Main Phone field */}
            <input
              type="text"
              required
              maxLength={15}
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: errors.phone ? '1px solid #EF4444' : '1px solid var(--border)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '14px'
              }}
            />
          </div>
          {errors.phone && (
            <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px', display: 'block' }}>{errors.phone}</span>
          )}
        </div>

        {/* Actions Button Block */}
        {isDirty && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={!isValid}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isValid ? 'var(--primary-color, #FF5722)' : 'var(--border)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                cursor: isValid ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {t.cancel}
            </button>
          </div>
        )}
      </form>

      {/* PIN Card */}
      <div style={{
        background: '#FAF8F5',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
          {t.pinTitle}
        </h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-soft)' }}>
          {t.pinSub}
        </p>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '22px',
          fontWeight: '700',
          letterSpacing: '2px',
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
            border: '1px solid var(--border)',
            backgroundColor: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            color: 'var(--text)'
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

      {/* Password Section */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
          {lang === 'ar' ? 'كلمة المرور' : 'Password'}
        </h3>
        <ChangePasswordForm lang={lang} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

      <button
        onClick={handleSignOut}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          color: '#DC2626',
          border: '1px solid #FCA5A5',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer'
        }}
      >
        {t.signOut}
      </button>

      {/* Change Email Modal */}
      {emailModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            position: 'relative',
            direction: isRtl ? 'rtl' : 'ltr',
            textAlign: isRtl ? 'right' : 'left'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>
              {t.emailModalTitle}
            </h3>
            
            <form onSubmit={handleSendVerification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {t.newEmailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                />
              </div>

              {emailMessage && (
                <p style={{
                  fontSize: '13px',
                  color: emailMessage === t.verificationSent ? '#16A34A' : '#EF4444',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {emailMessage}
                </p>
              )}

              <p style={{ fontSize: '11px', color: 'var(--text-soft)', margin: 0 }}>
                {t.emailChangeNote}
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={emailLoading || !newEmail.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary-color, #FF5722)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: (emailLoading || !newEmail.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {emailLoading ? '...' : t.sendVerification}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setEmailModalOpen(false);
                    setNewEmail('');
                    setEmailMessage('');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t.close}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
