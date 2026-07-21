import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import 'auth_repository.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _authRepo = AuthRepository();
  final _emailController = TextEditingController();

  bool _isLoading = false;
  String? _errorMsg;
  String? _successMsg;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleReset() async {
    setState(() {
      _errorMsg = null;
      _successMsg = null;
      _isLoading = true;
    });

    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() {
        _errorMsg = 'Please enter your email address.';
        _isLoading = false;
      });
      return;
    }

    try {
      await _authRepo.resetPasswordForEmail(email);
      if (mounted) {
        setState(() {
          _successMsg = 'Reset link sent! Please check your email to set a new password.';
          _isLoading = false;
        });
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
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: QColors.text),
          onPressed: () => context.pop(),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(QSpacing.lg),
          child: QCard(
            padding: const EdgeInsets.all(QSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Reset password',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: QColors.text,
                  ),
                ),
                const SizedBox(height: QSpacing.sm),
                const Text(
                  'Enter your account email address and we will send you a password reset link.',
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

                if (_successMsg != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(QSpacing.md),
                    decoration: BoxDecoration(
                      color: QColors.successBg,
                      borderRadius: BorderRadius.circular(8),
                      // ignore: deprecated_member_use
                      border: Border.all(color: QColors.successFg.withOpacity(0.2)),
                    ),
                    child: Text(
                      _successMsg!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: QColors.successFg,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: QSpacing.md),
                ],

                QInput(
                  label: 'Email address',
                  hint: 'e.g. john@example.com',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: QSpacing.lg),

                QButton.primary(
                  label: 'Send reset link',
                  onPressed: _handleReset,
                  isLoading: _isLoading,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
