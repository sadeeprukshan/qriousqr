import 'package:flutter/material.dart';
import '../config/supabase_client.dart';
import 'models/customer_profile.dart';

class AuthState extends ChangeNotifier {
  CustomerProfile? _profile;
  CustomerProfile? get profile => _profile;
  bool get isPremium => _profile?.isPremium ?? false;

  Future<void> refresh() async {
    try {
      if (supabase.auth.currentSession == null) {
        _profile = null;
        notifyListeners();
        return;
      }
      final res = await supabase.rpc('customer_me');
      if (res is List && res.isNotEmpty) {
        _profile = CustomerProfile.fromMap(Map<String, dynamic>.from(res.first));
      } else {
        _profile = null;
      }
    } catch (_) {
      _profile = null;
    }
    notifyListeners();
  }

  void clear() {
    _profile = null;
    notifyListeners();
  }
}

final authState = AuthState();
