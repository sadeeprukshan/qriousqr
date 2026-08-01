import '../../config/supabase_client.dart';
import '../../shared/models/customer_profile.dart';


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
