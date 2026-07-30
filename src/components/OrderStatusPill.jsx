import React from 'react';
import { useLang } from '../context/LanguageContext.jsx';

const LABELS = {
  pending: { en: 'Preparing', ar: 'قيد التحضير' },
  ready:   { en: 'Ready',     ar: 'جاهز' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', ar: 'ملغى' },
};

const COLORS = {
  pending:   { bg: '#FFF6F2', fg: '#FF5722' },
  ready:     { bg: '#E8F4FD', fg: '#0E7C7B' },
  delivered: { bg: '#EFEFEF', fg: '#666666' },
  cancelled: { bg: '#FEEEEE', fg: '#C53030' },
};

export default function OrderStatusPill({ status }) {
  const { lang } = useLang();
  
  const text = LABELS[status]?.[lang] || LABELS[status]?.en || status;
  const style = COLORS[status] || { bg: '#EFEFEF', fg: '#666666' };

  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.fg,
      fontSize: '11px',
      fontWeight: '700',
      padding: '4px 10px',
      borderRadius: '20px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      textTransform: 'uppercase',
      letterSpacing: lang === 'ar' ? '0' : '0.5px',
      fontFamily: lang === 'ar' ? 'var(--font-ar)' : 'var(--font-en)'
    }}>
      {text}
    </span>
  );
}
