import React, { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { validateNewPassword } from '../lib/passwordRules.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isDemoAccount } from '../lib/demoAccounts.js';

const TEXT = {
  en: {
    newPass: 'New Password',
    confirmPass: 'Confirm New Password',
    placeholder: '6–72 characters',
    submit: 'Change Password',
    changing: 'Changing...',
    success: 'Password updated.',
  },
  ar: {
    newPass: 'كلمة المرور الجديدة',
    confirmPass: 'تأكيد كلمة المرور الجديدة',
    placeholder: '٦-٧٢ حرفاً',
    submit: 'تغيير كلمة المرور',
    changing: 'جاري التغيير...',
    success: 'تم تحديث كلمة المرور.',
  }
};

export default function ChangePasswordForm({ lang = 'en', onSuccess }) {
  const { user } = useAuth();
  const isDemo = isDemoAccount(user?.email);

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const t = TEXT[lang] || TEXT.en;
  const isRtl = lang === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const { ok, error } = validateNewPassword(next, confirm);
    if (!ok) {
      setErrorMsg(error);
      return;
    }

    if (isDemo) {
      setErrorMsg('');
      setNext('');
      setConfirm('');
      setSuccessMsg(
        lang === 'ar'
          ? 'حساب تجريبي: لم يتم تغيير كلمة المرور.'
          : 'Demo account: password was not changed.'
      );
      if (onSuccess) {
        onSuccess();
      }
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: next });
      if (err) {
        setErrorMsg(err.message);
      } else {
        setNext('');
        setConfirm('');
        setSuccessMsg(t.success);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      boxSizing: 'border-box',
      textAlign: isRtl ? 'right' : 'left',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      {isDemo && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: '#92400E',
          fontSize: '13px',
          marginBottom: '16px',
          lineHeight: 1.5,
          textAlign: isRtl ? 'right' : 'left'
        }}>
          {lang === 'ar' ? (
            <>
              <strong>حساب تجريبي.</strong> تغيير كلمة المرور معطل هنا حتى يتمكن المختبرون من تسجيل الدخول. جرّب هذه الميزة بحساب حقيقي قمت بتسجيله.
            </>
          ) : (
            <>
              <strong>Demo account.</strong> Password changes are disabled here so testers can keep signing in. Try this feature with a real account you've registered.
            </>
          )}
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
          {t.newPass}
        </label>
        <input
          type="password"
          required
          placeholder={t.placeholder}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            outline: 'none',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            color: 'var(--text)'
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-soft)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
          {t.confirmPass}
        </label>
        <input
          type="password"
          required
          placeholder={t.placeholder}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            outline: 'none',
            fontSize: '14px',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            color: 'var(--text)'
          }}
        />
      </div>

      {errorMsg && (
        <span style={{ fontSize: '12px', color: '#EF4444', display: 'block' }}>{errorMsg}</span>
      )}

      {successMsg && (
        <span style={{ fontSize: '12px', color: '#10B981', display: 'block', fontWeight: '600' }}>{successMsg}</span>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--primary-color, #FF5722)',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '14px',
          fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          marginTop: '4px'
        }}
      >
        {loading ? t.changing : t.submit}
      </button>
    </form>
  );
}
