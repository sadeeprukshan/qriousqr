import '../../config/supabase_client.dart';

class CustomerProfile {
  final String id;
  final String email;
  final String firstName;
  final String lastName;

  CustomerProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
  });

  factory CustomerProfile.fromMap(Map<String, dynamic> map) {
    return CustomerProfile(
      id: map['id'] ?? map['customer_id'] ?? '',
      email: map['email'] ?? '',
      firstName: map['first_name'] ?? 'Diner',
      lastName: map['last_name'] ?? '',
    );
  }
}

class HomeRepository {
  Future<CustomerProfile?> fetchCustomerProfile() async {
    try {
      final res = await supabase.rpc('customer_me');
      if (res is List && res.isNotEmpty) {
        return CustomerProfile.fromMap(Map<String, dynamic>.from(res.first));
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
