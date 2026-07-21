import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app.dart';
import 'config/env.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: Env.supabaseUrl,
    // ignore: deprecated_member_use
    anonKey: Env.supabaseAnonKey,
  );

  runApp(const QriousQrApp());
}
