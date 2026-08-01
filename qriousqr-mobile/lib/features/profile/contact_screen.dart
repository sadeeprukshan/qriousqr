import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyController = TextEditingController();
  final _messageController = TextEditingController();

  bool _isLoading = false;
  bool _isSuccess = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _initFields();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _companyController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _initFields() {
    final profile = authState.profile;
    if (profile != null) {
      _nameController.text = '${profile.firstName} ${profile.lastName}'.trim();
      _emailController.text = profile.email;
      _phoneController.text = profile.phoneFull ?? '';
    }

    // Read prefilled query parameters from GoRouterState after frame rendering
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final state = GoRouterState.of(context);
      final msgParam = state.uri.queryParameters['message'];
      if (msgParam != null && msgParam.isNotEmpty) {
        setState(() {
          _messageController.text = msgParam;
        });
      }
    });
  }

  Future<void> _handleSubmit() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final company = _companyController.text.trim();
    final message = _messageController.text.trim();

    final isArabic = languageState.isArabic;

    if (name.isEmpty || email.isEmpty || message.isEmpty) {
      setState(() {
        _errorMsg = isArabic 
            ? 'يرجى ملء جميع الحقول المطلوبة (الاسم، البريد الإلكتروني، والرسالة).' 
            : 'Please fill in all required fields (Name, Email, and Message).';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      // Invoke the Edge Function via the Supabase Client
      await supabase.functions.invoke(
        'send-contact-message',
        body: {
          'name': name,
          'email': email,
          'phone': phone,
          'company_name': company,
          'message': message,
          'website': '', // honeypot empty
        },
      );

      if (mounted) {
        setState(() {
          _isSuccess = true;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMsg = isArabic
              ? 'فشل إرسال الرسالة. يرجى المحاولة لاحقاً أو إرسال بريد إلكتروني إلى hello@qriousqr.com'
              : 'Failed to send message. Please try again or email hello@qriousqr.com directly.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;

    if (_isSuccess) {
      return QScaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(QSpacing.lg),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.check_circle_outline,
                    color: Colors.green,
                    size: 80,
                  ),
                  const SizedBox(height: QSpacing.lg),
                  Text(
                    isArabic ? 'تم إرسال الرسالة!' : 'Message Sent!',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: QColors.text,
                    ),
                  ),
                  const SizedBox(height: QSpacing.md),
                  Text(
                    isArabic 
                        ? 'شكراً لك. سنقوم بالرد عليك خلال 24 ساعة.' 
                        : "Message sent — we'll be in touch within 24 hours.",
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      color: QColors.textMuted,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: QSpacing.xl),
                  QButton.primary(
                    label: isArabic ? 'العودة للملف الشخصي' : 'Back to Profile',
                    onPressed: () => context.pop(),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return QScaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with back button
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: QSpacing.md,
                vertical: QSpacing.sm,
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: QColors.text),
                    onPressed: () => context.pop(),
                  ),
                  const SizedBox(width: QSpacing.xs),
                  Text(
                    isArabic ? 'اتصل بنا / ترقية' : 'Contact Us / Upgrade',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: QColors.text,
                    ),
                  ),
                ],
              ),
            ),

            // Form Content
            Expanded(
              child: SingleChildScrollView(
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
                          border: Border.all(color: QColors.dangerFg.withOpacity(0.2)),
                        ),
                        child: Text(
                          _errorMsg!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: QColors.dangerFg,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: QSpacing.md),
                    ],

                    QCard(
                      padding: const EdgeInsets.all(QSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          QInput(
                            label: isArabic ? 'الاسم بالكامل *' : 'Full Name *',
                            controller: _nameController,
                          ),
                          const SizedBox(height: QSpacing.md),
                          QInput(
                            label: isArabic ? 'البريد الإلكتروني *' : 'Email *',
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: QSpacing.md),
                          QInput(
                            label: isArabic ? 'رقم الهاتف (اختياري)' : 'Phone Number (Optional)',
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: QSpacing.md),
                          QInput(
                            label: isArabic ? 'اسم المطعم (اختياري)' : 'Restaurant/Company Name (Optional)',
                            controller: _companyController,
                          ),
                          const SizedBox(height: QSpacing.md),
                          
                          // Message input
                          Text(
                            isArabic ? 'الرسالة *' : 'Message *',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: QColors.text,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _messageController,
                            maxLines: 5,
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: QColors.border),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(color: QColors.border),
                              ),
                            ),
                          ),
                          const SizedBox(height: QSpacing.lg),

                          QButton.primary(
                            label: isArabic ? 'إرسال الرسالة' : 'Send Message',
                            isLoading: _isLoading,
                            onPressed: _handleSubmit,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
