import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../auth/auth_repository.dart';
import 'home_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _homeRepo = HomeRepository();
  final _authRepo = AuthRepository();

  CustomerProfile? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profile = await _homeRepo.fetchCustomerProfile();
    if (mounted) {
      setState(() {
        _profile = profile;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSignOut() async {
    await _authRepo.signOut();
    if (mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final userEmail = supabase.auth.currentUser?.email ?? 'Unknown user';

    return QScaffold(
      body: Padding(
        padding: const EdgeInsets.all(QSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: QSpacing.md),
            // Header Wordmark
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'QriousQR',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: QColors.primary,
                    letterSpacing: -0.5,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: QColors.primarySoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'Diner Space',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: QColors.primary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: QSpacing.xl),

            if (_isLoading)
              const Expanded(
                child: Center(
                  child: CircularProgressIndicator(color: QColors.primary),
                ),
              )
            else ...[
              QCard(
                padding: const EdgeInsets.all(QSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello, ${_profile?.firstName ?? "Diner"}!',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: QColors.text,
                      ),
                    ),
                    const SizedBox(height: QSpacing.xs),
                    Text(
                      'Signed in as $userEmail',
                      style: const TextStyle(
                        fontSize: 13,
                        color: QColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: QSpacing.lg),

                    Container(
                      padding: const EdgeInsets.all(QSpacing.md),
                      decoration: BoxDecoration(
                        color: QColors.surface2,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.check_circle_outline, color: QColors.successFg, size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Authentication foundation connected to Supabase live database.',
                              style: TextStyle(
                                fontSize: 13,
                                color: QColors.text,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              QButton.secondary(
                label: 'Sign out',
                onPressed: _handleSignOut,
                icon: Icons.logout,
              ),
              const SizedBox(height: QSpacing.md),
            ],
          ],
        ),
      ),
    );
  }
}
