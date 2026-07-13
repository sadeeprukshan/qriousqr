export const CATEGORY_TRANSLATIONS = {
  en: {
    main_course: 'Main Course',
    dessert: 'Dessert',
    beverage: 'Beverage'
  },
  ar: {
    main_course: 'طبق رئيسي',
    dessert: 'حلوى',
    beverage: 'مشروب'
  }
};

export function translateCategory(category, lang = 'en') {
  const currentTranslations = CATEGORY_TRANSLATIONS[lang === 'ar' ? 'ar' : 'en'];
  return currentTranslations[category] || category;
}
