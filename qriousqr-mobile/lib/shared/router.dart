import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/supabase_client.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/restaurants/restaurants_list_screen.dart';
import '../features/restaurants/restaurant_screen.dart';
import '../features/restaurants/product_detail_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/coupons/coupons_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/contact_screen.dart';
import 'widgets/customer_nav_shell.dart';

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
  initialLocation: '/restaurants',
  routes: [
    // Auth routes outside the shell
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

    // Stateful Shell Route for Persistent Bottom Nav
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return CustomerNavShell(navigationShell: navigationShell);
      },
      branches: [
        // Branch 0: Restaurants
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/restaurants',
              builder: (context, state) => const RestaurantsListScreen(),
              routes: [
                GoRoute(
                  path: 'restaurant/:slug',
                  builder: (context, state) => RestaurantScreen(
                    slug: state.pathParameters['slug']!,
                  ),
                  routes: [
                    GoRoute(
                      path: 'product/:productId',
                      builder: (context, state) => ProductDetailScreen(
                        slug: state.pathParameters['slug']!,
                        productId: state.pathParameters['productId']!,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),

        // Branch 1: Coupons
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/coupons',
              builder: (context, state) => const CouponsScreen(),
            ),
          ],
        ),

        // Branch 2: Orders
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/orders',
              builder: (context, state) => const CustomerOrdersScreen(),
            ),
          ],
        ),

        // Branch 3: Profile
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const CustomerProfileScreen(),
              routes: [
                GoRoute(
                  path: 'contact',
                  builder: (context, state) => const ContactScreen(),
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
  redirect: (context, state) {
    final isSignedIn = authStateNotifier.isSignedIn;
    final isAuthRoute = state.matchedLocation == '/login' ||
        state.matchedLocation == '/register' ||
        state.matchedLocation == '/forgot-password';

    // Temporary redirect from old /home to new landing
    if (state.matchedLocation == '/home') {
      return '/restaurants';
    }

    if (!isSignedIn && !isAuthRoute) {
      return '/login';
    }

    if (isSignedIn && isAuthRoute) {
      return '/restaurants';
    }

    return null;
  },
);
