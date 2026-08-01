import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'config/env.dart';
import 'config/supabase_client.dart';
import 'shared/auth_state.dart';
import 'shared/language_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    // ignore: deprecated_member_use
    anonKey: Env.supabaseAnonKey,
  );

  // Initialize global states
  await languageState.load();
  if (supabase.auth.currentSession != null) {
    await authState.refresh();
  }

  // Listen to auth changes globally to keep authState updated
  supabase.auth.onAuthStateChange.listen((data) {
    if (data.event == AuthChangeEvent.signedIn || data.event == AuthChangeEvent.tokenRefreshed) {
      authState.refresh();
    } else if (data.event == AuthChangeEvent.signedOut) {
      authState.clear();
    }
  });

  runApp(const QriousQrApp());
}

