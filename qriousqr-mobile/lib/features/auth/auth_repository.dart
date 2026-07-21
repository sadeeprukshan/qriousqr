import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/supabase_client.dart';

class AuthRepository {
  Future<void> signInWithEmailOrPhone({
    required String identifier,
    required String password,
  }) async {
    final raw = identifier.trim();
    String emailToUse = raw;

    if (!raw.contains('@')) {
      final normalized = '+${raw.replaceAll(RegExp(r'[^\d]'), '')}';
      final response = await supabase.rpc('customer_email_by_phone', params: {
        'p_phone_full': normalized,
      });

      if (response == null || response.toString().isEmpty) {
        throw const AuthException('No account found with that phone number.');
      }
      emailToUse = response.toString();
    }

    final AuthResponse res = await supabase.auth.signInWithPassword(
      email: emailToUse,
      password: password,
    );

    if (res.user == null) {
      throw const AuthException('Sign in failed.');
    }

    // Verify customer status
    final isCustomer = await checkIsCustomer();
    if (!isCustomer) {
      await supabase.auth.signOut();
      throw const AuthException('This account is not registered as a customer.');
    }
  }

  Future<bool> checkIsCustomer() async {
    try {
      final res = await supabase.rpc('customer_me');
      if (res is List && res.isNotEmpty) {
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> registerCustomer({
    required String firstName,
    required String lastName,
    required String countryCode,
    required String phoneCode,
    required String phone,
    required String email,
    required String password,
    required String birthday,
    required String gender,
  }) async {
    final authRes = await supabase.auth.signUp(
      email: email,
      password: password,
    );

    if (authRes.user == null) {
      throw const AuthException('Registration failed to create user account.');
    }

    final normalizedPhone = '+$phoneCode${phone.replaceAll(RegExp(r'[^\d]'), '')}';

    await supabase.rpc('register_customer', params: {
      'p_first_name': firstName.trim(),
      'p_last_name': lastName.trim(),
      'p_country_code': countryCode,
      'p_phone_code': phoneCode,
      'p_phone_number': phone.trim(),
      'p_phone_full': normalizedPhone,
      'p_birthday': birthday,
      'p_gender': gender,
    });
  }

  Future<void> resetPasswordForEmail(String email) async {
    await supabase.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo: 'https://qriousqr.com/auth?mode=reset',
    );
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }
}
