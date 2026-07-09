// ISO alpha-2 → { name, dial, flag emoji }
export const COUNTRIES = [
  { code: 'LB', name: 'Lebanon',            dial: '+961', flag: '🇱🇧' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',       dial: '+966', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt',              dial: '+20',  flag: '🇪🇬' },
  { code: 'JO', name: 'Jordan',             dial: '+962', flag: '🇯🇴' },
  { code: 'KW', name: 'Kuwait',             dial: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar',              dial: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain',            dial: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman',               dial: '+968', flag: '🇴🇲' },
  { code: 'IQ', name: 'Iraq',               dial: '+964', flag: '🇮🇶' },
  { code: 'SY', name: 'Syria',              dial: '+963', flag: '🇸🇾' },
  { code: 'YE', name: 'Yemen',              dial: '+967', flag: '🇾🇪' },
  { code: 'PS', name: 'Palestine',          dial: '+970', flag: '🇵🇸' },
  { code: 'MA', name: 'Morocco',            dial: '+212', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia',            dial: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algeria',            dial: '+213', flag: '🇩🇿' },
  { code: 'US', name: 'United States',      dial: '+1',   flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom',     dial: '+44',  flag: '🇬🇧' },
  { code: 'IN', name: 'India',              dial: '+91',  flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan',           dial: '+92',  flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh',         dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka',          dial: '+94',  flag: '🇱🇰' },
  { code: 'TR', name: 'Turkey',             dial: '+90',  flag: '🇹🇷' },
  { code: 'FR', name: 'France',             dial: '+33',  flag: '🇫🇷' },
  { code: 'DE', name: 'Germany',            dial: '+49',  flag: '🇩🇪' },
  { code: 'AU', name: 'Australia',          dial: '+61',  flag: '🇦🇺' },
  { code: 'CA', name: 'Canada',             dial: '+1',   flag: '🇨🇦' },
];

export function dialForCountry(code) {
  return COUNTRIES.find(c => c.code === code)?.dial || '';
}
