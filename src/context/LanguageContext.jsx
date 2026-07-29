import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'qrious.lang';

const readInitial = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'ar' || v === 'en') return v;
  } catch {}
  return 'en';
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitial);

  // Persist + apply to <html> whenever it changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  const setLang = (next) => {
    if (next === 'ar' || next === 'en') setLangState(next);
  };
  const toggleLang = () => setLangState((l) => (l === 'ar' ? 'en' : 'ar'));

  const value = useMemo(() => ({ lang, setLang, toggleLang, isRTL: lang === 'ar' }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
