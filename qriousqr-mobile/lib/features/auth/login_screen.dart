import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import 'auth_repository.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authRepo = AuthRepository();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn() async {
    setState(() {
      _errorMsg = null;
      _isLoading = true;
    });

    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    if (identifier.isEmpty || password.isEmpty) {
      setState(() {
        _errorMsg = 'Please enter both email/phone and password.';
        _isLoading = false;
      });
      return;
    }

    try {
      await _authRepo.signInWithEmailOrPhone(
        identifier: identifier,
        password: password,
      );
      if (mounted) {
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMsg = e.toString().replaceAll('Exception: ', '').replaceAll('AuthException: ', '');
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return QScaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(QSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Wordmark
              const Text(
                'QriousQR',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: QColors.primary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: QSpacing.xs),
              const Text(
                'Diner loyalty at every restaurant',
                style: TextStyle(
                  fontSize: 14,
                  color: QColors.textMuted,
                ),
              ),
              const SizedBox(height: QSpacing.xl),

              // Login Card
              QCard(
                padding: const EdgeInsets.all(QSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Welcome back',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: QColors.text,
                      ),
                    ),
                    const SizedBox(height: QSpacing.sm),
                    const Text(
                      'Sign in to your diner account to access BOGO coupons and rewards.',
                      style: TextStyle(
                        fontSize: 14,
                        color: QColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: QSpacing.lg),

                    if (_errorMsg != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(QSpacing.md),
                        decoration: BoxDecoration(
                          color: QColors.dangerBg,
                          borderRadius: BorderRadius.circular(8),
                          // ignore: deprecated_member_use
                          border: Border.all(color: QColors.dangerFg.withOpacity(0.2)),
                        ),
                        child: Text(
                          _errorMsg!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: QColors.dangerFg,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(height: QSpacing.md),
                    ],

                    QInput(
                      label: 'Email or phone number',
                      hint: 'e.g. diner@qriousqr.local or +96171234567',
                      controller: _identifierController,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: QSpacing.md),

                    QInput(
                      label: 'Password',
                      hint: 'Enter your password',
                      controller: _passwordController,
                      obscureText: true,
                    ),
                    const SizedBox(height: QSpacing.sm),

                    Align(
                      alignment: Alignment.centerRight,
                      child: QButton.ghost(
                        label: 'Forgot password?',
                        onPressed: () => context.push('/forgot-password'),
                      ),
                    ),
                    const SizedBox(height: QSpacing.md),

                    QButton.primary(
                      label: 'Sign in',
                      onPressed: _handleSignIn,
                      isLoading: _isLoading,
                    ),
                    const SizedBox(height: QSpacing.md),

                    Center(
                      child: QButton.ghost(
                        label: 'New here? Create account',
                        onPressed: () => context.push('/register'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
