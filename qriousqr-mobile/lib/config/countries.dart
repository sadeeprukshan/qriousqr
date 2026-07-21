class Country {
  final String code;
  final String name;
  final String dial;
  final String flag;

  const Country({
    required this.code,
    required this.name,
    required this.dial,
    required this.flag,
  });
}

const List<Country> countries = [
  Country(code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧'),
  Country(code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪'),
  Country(code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦'),
  Country(code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬'),
  Country(code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴'),
  Country(code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼'),
  Country(code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦'),
  Country(code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭'),
  Country(code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲'),
  Country(code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶'),
  Country(code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾'),
  Country(code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪'),
  Country(code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸'),
  Country(code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦'),
  Country(code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳'),
  Country(code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿'),
  Country(code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸'),
  Country(code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧'),
  Country(code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳'),
  Country(code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰'),
  Country(code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩'),
  Country(code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰'),
  Country(code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷'),
  Country(code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷'),
  Country(code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪'),
  Country(code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺'),
  Country(code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦'),
];

String dialForCountry(String code) {
  final found = countries.where((c) => c.code == code).firstOrNull;
  return found?.dial ?? '';
}
