import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';

const T_CARD = {
  en: {
    premium: 'PREMIUM',
    title: 'Unlock BOGO coupons',
    desc: 'Premium customers get 3 buy-one-get-one coupons per restaurant, every year. Available across every restaurant on QriousQR.',
    btn: 'Contact us to upgrade'
  },
  ar: {
    premium: 'بريميوم',
    title: 'تفعيل قسائم BOGO',
    desc: 'يحصل عملاء بريميوم على 3 قسائم buy-one-get-one لكل مطعم سنوياً. متوفرة في جميع المطاعم على QriousQR.',
    btn: 'اتصل بنا للترقية'
  }
};

export default function UpgradeToPremiumCard() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isRtl = lang === 'ar';
  const t = T_CARD[lang] || T_CARD.en;

  const handleUpgradeClick = () => {
    const subject = encodeURIComponent('upgrade');
    const message = encodeURIComponent('I would like to upgrade to Premium');
    navigate(`/contact?subject=${subject}&message=${message}`);
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderLeft: isRtl ? 'none' : '4px solid #FF5722',
      borderRight: isRtl ? '4px solid #FF5722' : 'none',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '12px',
      margin: '16px 0',
      textAlign: isRtl ? 'right' : 'left',
      width: '100%',
      fontFamily: isRtl ? 'var(--font-ar)' : 'var(--font-en)'
    }}>
      <span style={{
        backgroundColor: '#FFEFEA',
        color: '#FF5722',
        fontSize: '10px',
        fontWeight: '800',
        padding: '3px 8px',
        borderRadius: '12px',
        letterSpacing: isRtl ? '0' : '0.5px'
      }}>
        {t.premium}
      </span>
      <h3 style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#14110F'
      }}>
        {t.title}
      </h3>
      <p style={{
        margin: 0,
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#666'
      }}>
        {t.desc}
      </p>
      <button 
        onClick={handleUpgradeClick}
        style={{
          backgroundColor: '#FF5722',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '4px',
          transition: 'background-color 0.2s',
          alignSelf: isRtl ? 'flex-start' : 'flex-start'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#E64A19'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#FF5722'}
      >
        {t.btn}
      </button>
    </div>
  );
}
