import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/countries.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import 'auth_repository.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _authRepo = AuthRepository();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _birthdayController = TextEditingController();

  String _selectedCountryCode = 'LB';
  String _selectedGender = 'Male';
  bool _acceptedTerms = false;

  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _birthdayController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    setState(() {
      _errorMsg = null;
      _isLoading = true;
    });

    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final birthday = _birthdayController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty || phone.isEmpty || email.isEmpty || password.isEmpty || birthday.isEmpty) {
      setState(() {
        _errorMsg = 'Please fill in all required fields.';
        _isLoading = false;
      });
      return;
    }

    if (!_acceptedTerms) {
      setState(() {
        _errorMsg = 'You must accept the Terms of Service and Privacy Policy.';
        _isLoading = false;
      });
      return;
    }

    try {
      final phoneCode = dialForCountry(_selectedCountryCode).replaceAll('+', '');

      await _authRepo.registerCustomer(
        firstName: firstName,
        lastName: lastName,
        countryCode: _selectedCountryCode,
        phoneCode: phoneCode,
        phone: phone,
        email: email,
        password: password,
        birthday: birthday,
        gender: _selectedGender,
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

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.inAppWebView);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentDial = dialForCountry(_selectedCountryCode);

    return QScaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: QColors.text),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(QSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Join QriousQR',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: QColors.primary,
              ),
            ),
            const SizedBox(height: QSpacing.xs),
            const Text(
              'Create a diner account to claim BOGO coupons.',
              style: TextStyle(fontSize: 14, color: QColors.textMuted),
            ),
            const SizedBox(height: QSpacing.lg),

            QCard(
              padding: const EdgeInsets.all(QSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                    label: 'First name',
                    hint: 'e.g. John',
                    controller: _firstNameController,
                  ),
                  const SizedBox(height: QSpacing.md),

                  QInput(
                    label: 'Last name',
                    hint: 'e.g. Doe',
                    controller: _lastNameController,
                  ),
                  const SizedBox(height: QSpacing.md),

                  // Country Selection
                  const Text(
                    'Country',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: QColors.text),
                  ),
                  const SizedBox(height: QSpacing.xs + 2),
                  DropdownButtonFormField<String>(
                    // ignore: deprecated_member_use
                    value: _selectedCountryCode,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      filled: true,
                      fillColor: QColors.surface,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: QColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: QColors.primary, width: 1.5),
                      ),
                    ),
                    items: countries.map((c) {
                      return DropdownMenuItem<String>(
                        value: c.code,
                        child: Text('${c.flag}  ${c.name} (${c.dial})'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedCountryCode = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: QSpacing.md),

                  QInput(
                    label: 'Phone number',
                    hint: '71234567',
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    prefixIcon: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      child: Text(
                        currentDial,
                        style: const TextStyle(fontWeight: FontWeight.w600, color: QColors.textMuted),
                      ),
                    ),
                  ),
                  const SizedBox(height: QSpacing.md),

                  QInput(
                    label: 'Email address',
                    hint: 'e.g. john@example.com',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: QSpacing.md),

                  QInput(
                    label: 'Password',
                    hint: 'Min 6 characters',
                    controller: _passwordController,
                    obscureText: true,
                  ),
                  const SizedBox(height: QSpacing.md),

                  QInput(
                    label: 'Birthday (YYYY-MM-DD)',
                    hint: '1995-05-15',
                    controller: _birthdayController,
                    keyboardType: TextInputType.datetime,
                  ),
                  const SizedBox(height: QSpacing.md),

                  // Gender Selection
                  const Text(
                    'Gender',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: QColors.text),
                  ),
                  const SizedBox(height: QSpacing.xs),
                  Row(
                    children: [
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text('Male', style: TextStyle(fontSize: 14)),
                          value: 'Male',
                          // ignore: deprecated_member_use
                          groupValue: _selectedGender,
                          activeColor: QColors.primary,
                          contentPadding: EdgeInsets.zero,
                          // ignore: deprecated_member_use
                          onChanged: (val) => setState(() => _selectedGender = val!),
                        ),
                      ),
                      Expanded(
                        child: RadioListTile<String>(
                          title: const Text('Female', style: TextStyle(fontSize: 14)),
                          value: 'Female',
                          // ignore: deprecated_member_use
                          groupValue: _selectedGender,
                          activeColor: QColors.primary,
                          contentPadding: EdgeInsets.zero,
                          // ignore: deprecated_member_use
                          onChanged: (val) => setState(() => _selectedGender = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: QSpacing.md),

                  // Terms Checkbox
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _acceptedTerms,
                        activeColor: QColors.primary,
                        onChanged: (val) => setState(() => _acceptedTerms = val ?? false),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _acceptedTerms = !_acceptedTerms),
                          child: Wrap(
                            children: [
                              const Text('I agree to the ', style: TextStyle(fontSize: 13, color: QColors.textMuted)),
                              GestureDetector(
                                onTap: () => _openUrl('https://qriousqr.com/legal/terms'),
                                child: const Text(
                                  'Terms of Service',
                                  style: TextStyle(fontSize: 13, color: QColors.primary, fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Text(' and ', style: TextStyle(fontSize: 13, color: QColors.textMuted)),
                              GestureDetector(
                                onTap: () => _openUrl('https://qriousqr.com/legal/privacy'),
                                child: const Text(
                                  'Privacy Policy',
                                  style: TextStyle(fontSize: 13, color: QColors.primary, fontWeight: FontWeight.w600),
                                ),
                              ),
                              const Text('.', style: TextStyle(fontSize: 13, color: QColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: QSpacing.lg),

                  QButton.primary(
                    label: 'Create account',
                    onPressed: _handleRegister,
                    isLoading: _isLoading,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
