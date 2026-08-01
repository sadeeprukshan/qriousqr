class CustomerProfile {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String tier; // 'premium' | 'regular'
  final String? userPin; // 9-digit code the operator asks for
  final String? phoneFull;
  final String countryCode;
  final String phoneCode;
  final String phoneNumber;
  final String? gender;
  final String? birthday;

  CustomerProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.tier = 'regular',
    this.userPin,
    this.phoneFull,
    this.countryCode = 'LB',
    this.phoneCode = '961',
    this.phoneNumber = '',
    this.gender,
    this.birthday,
  });

  bool get isPremium => tier == 'premium';

  factory CustomerProfile.fromMap(Map<String, dynamic> map) {
    return CustomerProfile(
      id: map['id'] ?? map['customer_id'] ?? '',
      email: map['email'] ?? '',
      firstName: map['first_name'] ?? 'Diner',
      lastName: map['last_name'] ?? '',
      tier: (map['tier'] as String?) ?? 'regular',
      userPin: map['user_pin'] as String?,
      phoneFull: map['phone_full'] as String?,
      countryCode: map['country_code'] ?? 'LB',
      phoneCode: map['phone_code'] ?? '961',
      phoneNumber: map['phone_number'] ?? '',
      gender: map['gender'] as String?,
      birthday: map['birthday'] as String?,
    );
  }
}
