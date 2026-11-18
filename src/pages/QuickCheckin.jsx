import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { getCheckinInfo, checkinOrder } from '../services/counterService.js';

// Customer scanned the counter tablet's check-in QR: type the order number printed
// on the POS receipt, then continue to that order's alert page.

const T = {
  en: {
    title: 'Get alerted when your order is ready',
    label: 'Order number on your receipt',
    placeholder: 'e.g. 59',
    submit: 'Continue',
    busy: 'Finding your order…',
    notFound: 'This QR code is no longer active. Please ask the staff.',
    invalid: 'Enter the order number exactly as printed on your receipt.',
    rateLimited: 'Too many check-ins right now. Please try again in a minute.',
    generic: 'Something went wrong. Please try again.',
    loading: 'Loading…',
    langToggle: 'العربية',
  },
  ar: {
    title: 'احصل على تنبيه عند جهوزية طلبك',
    label: 'رقم الطلب المطبوع على الفاتورة',
    placeholder: 'مثال: 59',
    submit: 'متابعة',
    busy: 'جاري البحث عن طلبك…',
    notFound: 'رمز QR هذا لم يعد مفعلاً. يرجى سؤال الموظف.',
    invalid: 'أدخل رقم الطلب كما هو مطبوع على الفاتورة.',
    rateLimited: 'عدد كبير من الطلبات الآن. حاول مرة أخرى بعد دقيقة.',
    generic: 'حدث خطأ ما. حاول مرة أخرى.',
    loading: 'جاري التحميل…',
    langToggle: 'English',
  },
};

export default function QuickCheckin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { lang, toggleLang, isRTL } = useLang();
  const t = T[lang] || T.en;

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCheckinInfo(code)
      .then((row) => setInfo(row || null))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [code]);

  const submit = async (e) => {
    e.preventDefault();
    if (!number.trim()) return;
    setBusy(true);
    setError('');
    try {
      const row = await checkinOrder(code, number);
      navigate(`/track/${row.qr_token}`, { replace: true });
    } catch (err) {
      const m = (err.message || '').toLowerCase();
      setError(
        m.includes('invalid_order_number') ? t.invalid
          : m.includes('rate_limited') ? t.rateLimited
          : m.includes('checkin_not_found') ? t.notFound
          : t.generic
      );
      setBusy(false);
    }
  };

  const color = info?.company_primary_color || '#FF5722';
  const name = isRTL ? (info?.company_name_ar || info?.company_name_en) : (info?.company_name_en || info?.company_name_ar);

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box', direction: isRTL ? 'rtl' : 'ltr', fontFamily: isRTL ? 'var(--font-ar)' : 'var(--font-en)' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', borderRadius: '24px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', borderTop: `6px solid ${color}` }}>
        {loading ? (
          <p style={{ color: '#6B7280' }}>{t.loading}</p>
        ) : !info ? (
          <p style={{ color: '#DC2626', fontWeight: 600, lineHeight: 1.5 }}>{t.notFound}</p>
        ) : (
          <>
            {info.company_logo_url && (
              <img src={info.company_logo_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover' }} />
            )}
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#14110F', marginTop: '10px' }}>{name}</div>
            <h1 style={{ fontSize: '21px', fontWeight: 900, color: '#14110F', margin: '18px 0 20px', lineHeight: 1.3 }}>🔔 {t.title}</h1>
            <form onSubmit={submit}>
              <label htmlFor="checkin-number" style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>
                {t.label}
              </label>
              <input
                id="checkin-number"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
                maxLength={16}
                value={number}
                onChange={(e) => { setNumber(e.target.value); setError(''); }}
                placeholder={t.placeholder}
                dir="ltr"
                style={{ width: '100%', boxSizing: 'border-box', padding: '14px', fontSize: '28px', fontWeight: 900, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.08em', border: '2px solid #E5E7EB', borderRadius: '14px', outline: 'none', background: '#FAF8F5' }}
              />
              {error && <p style={{ margin: '10px 0 0', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>{error}</p>}
              <button
                type="submit"
                disabled={busy || !number.trim()}
                style={{ marginTop: '18px', width: '100%', padding: '15px', borderRadius: '14px', border: 'none', background: color, color: '#FFFFFF', fontSize: '17px', fontWeight: 900, cursor: 'pointer', opacity: busy || !number.trim() ? 0.6 : 1 }}
              >
                {busy ? t.busy : t.submit}
              </button>
            </form>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={toggleLang}
        style={{ marginTop: '18px', border: '1px solid #E5E7EB', background: '#FFFFFF', borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
      >
        {t.langToggle}
      </button>
    </div>
  );
}
