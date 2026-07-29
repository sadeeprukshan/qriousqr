export const pickI18n = (obj, field, lang) => {
  if (!obj) return '';
  return (lang === 'ar' ? obj[`${field}_ar`] : obj[`${field}_en`]) ?? obj[`${field}_en`] ?? '';
};
