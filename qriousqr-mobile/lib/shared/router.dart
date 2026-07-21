import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/supabase_client.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/home/home_screen.dart';

class AuthStateNotifier extends ChangeNotifier {
  AuthStateNotifier() {
    supabase.auth.onAuthStateChange.listen((data) {
      notifyListeners();
    });
  }

  bool get isSignedIn => supabase.auth.currentSession != null;
}

final authStateNotifier = AuthStateNotifier();

final router = GoRouter(
  refreshListenable: authStateNotifier,
  initialLocation: '/home',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
  ],
  redirect: (context, state) {
    final isSignedIn = authStateNotifier.isSignedIn;
    final isAuthRoute = state.matchedLocation == '/login' ||
        state.matchedLocation == '/register' ||
        state.matchedLocation == '/forgot-password';

    if (!isSignedIn && !isAuthRoute) {
      return '/login';
    }

    if (isSignedIn && isAuthRoute) {
      return '/home';
    }

    return null;
  },
);
