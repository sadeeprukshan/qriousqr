import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/supabase_client.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/components/q_input.dart';
import '../../design_system/spacing.dart';
import '../../shared/widgets/q_scaffold.dart';
import '../../shared/auth_state.dart';
import '../../shared/language_state.dart';

class CustomerProfileScreen extends StatefulWidget {
  const CustomerProfileScreen({super.key});

  @override
  State<CustomerProfileScreen> createState() => _CustomerProfileScreenState();
}

class _CustomerProfileScreenState extends State<CustomerProfileScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();

  String? _gender;
  DateTime? _birthday;
  bool _isLoading = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _initFields();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _initFields() {
    final profile = authState.profile;
    if (profile != null) {
      _firstNameController.text = profile.firstName;
      _lastNameController.text = profile.lastName;
      _phoneController.text = profile.phoneNumber;
      _gender = profile.gender;
      if (profile.birthday != null) {
        _birthday = DateTime.tryParse(profile.birthday!);
      }
    }

    _firstNameController.addListener(_markDirty);
    _lastNameController.addListener(_markDirty);
    _phoneController.addListener(_markDirty);
  }

  void _markDirty() {
    if (mounted) {
      setState(() {
        _isDirty = true;
      });
    }
  }

  String _formatUserPin(String? pin) {
    if (pin == null || pin.isEmpty) return '--- --- ---';
    final clean = pin.replaceAll(RegExp(r'\s'), '');
    if (clean.length != 9) return pin;
    return '${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)}';
  }

  Future<void> _handleSave() async {
    final profile = authState.profile;
    if (profile == null) return;

    final isDemo = profile.email.endsWith('.local');
    if (isDemo) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final birthdayStr = _birthday != null 
          ? '${_birthday!.year}-${_birthday!.month.toString().padLeft(2, '0')}-${_birthday!.day.toString().padLeft(2, '0')}'
          : null;

      await supabase.rpc('update_customer_profile', params: {
        'p_first_name': _firstNameController.text.trim(),
        'p_last_name': _lastNameController.text.trim(),
        'p_birthday': birthdayStr,
        'p_gender': _gender,
        'p_country_code': profile.countryCode,
        'p_phone_code': profile.phoneCode,
        'p_phone': _phoneController.text.trim(),
      });

      await authState.refresh();
      
      if (mounted) {
        setState(() {
          _isDirty = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              languageState.isArabic 
                  ? 'تم تحديث الملف الشخصي بنجاح!' 
                  : 'Profile updated successfully!',
            ),
            backgroundColor: const Color(0xFF22C55E),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              languageState.isArabic 
                  ? 'حدث خطأ ما. يرجى المحاولة لاحقاً.' 
                  : 'Something went wrong. Please try again.',
            ),
            backgroundColor: QColors.dangerFg,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _selectBirthday() async {
    final profile = authState.profile;
    final isDemo = profile?.email.endsWith('.local') ?? false;
    if (isDemo) return;

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _birthday ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: QColors.primary,
              onPrimary: Colors.white,
              onSurface: QColors.text,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _birthday) {
      setState(() {
        _birthday = picked;
        _isDirty = true;
      });
    }
  }

  void _showChangePasswordDialog() {
    final isDemo = authState.profile?.email.endsWith('.local') ?? false;
    if (isDemo) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            languageState.isArabic 
                ? 'تغيير كلمة المرور غير متاح في الحساب التجريبي.' 
                : 'Changing password is not allowed for demo accounts.',
          ),
          backgroundColor: Colors.amber.shade800,
        ),
      );
      return;
    }

    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isSaving = false;
    String? dialogError;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final isArabic = languageState.isArabic;
            return AlertDialog(
              backgroundColor: QColors.surface,
              title: Text(
                isArabic ? 'تغيير كلمة المرور' : 'Change Password',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (dialogError != null) ...[
                    Text(
                      dialogError!,
                      style: const TextStyle(color: QColors.dangerFg, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: QSpacing.sm),
                  ],
                  QInput(
                    label: isArabic ? 'كلمة المرور الجديدة' : 'New Password',
                    controller: newPasswordController,
                    obscureText: true,
                  ),
                  const SizedBox(height: QSpacing.md),
                  QInput(
                    label: isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password',
                    controller: confirmPasswordController,
                    obscureText: true,
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: Text(isArabic ? 'إلغاء' : 'Cancel'),
                ),
                TextButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final pass = newPasswordController.text.trim();
                          final confirm = confirmPasswordController.text.trim();
                          if (pass.length < 6) {
                            setDialogState(() {
                              dialogError = isArabic 
                                  ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' 
                                  : 'Password must be at least 6 characters.';
                            });
                            return;
                          }
                          if (pass != confirm) {
                            setDialogState(() {
                              dialogError = isArabic 
                                  ? 'كلمات المرور غير متطابقة.' 
                                  : 'Passwords do not match.';
                            });
                            return;
                          }

                          setDialogState(() {
                            isSaving = true;
                            dialogError = null;
                          });

                          try {
                            await supabase.auth.updateUser(
                              UserAttributes(password: pass),
                            );
                            if (context.mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    isArabic 
                                        ? 'تم تغيير كلمة المرور بنجاح!' 
                                        : 'Password changed successfully!',
                                  ),
                                  backgroundColor: const Color(0xFF22C55E),
                                ),
                              );
                            }
                          } catch (e) {
                            setDialogState(() {
                              dialogError = e.toString().replaceAll('Exception: ', '');
                              isSaving = false;
                            });
                          }
                        },
                  child: isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: QColors.primary),
                        )
                      : Text(isArabic ? 'حفظ' : 'Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;
    final profile = authState.profile;

    if (profile == null) {
      return const QScaffold(
        body: Center(child: Text('Not authenticated.')),
      );
    }

    final isDemo = profile.email.endsWith('.local');
    final formattedPin = _formatUserPin(profile.userPin);

    return QScaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(QSpacing.lg, QSpacing.lg, QSpacing.lg, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              Text(
                isArabic ? 'الملف الشخصي' : 'Profile',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: QColors.text,
                ),
              ),
              const SizedBox(height: QSpacing.lg),

              // Demo warning banner
              if (isDemo) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(QSpacing.md),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800),
                      const SizedBox(width: QSpacing.sm),
                      Expanded(
                        child: Text(
                          isArabic 
                              ? 'حساب تجريبي: تعديل بيانات الملف الشخصي معطل.' 
                              : 'Demo Account: editing profile details is disabled.',
                          style: TextStyle(
                            color: Colors.amber.shade900,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: QSpacing.md),
              ],

              // User Info Header Card
              QCard(
                padding: const EdgeInsets.all(QSpacing.md),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: QColors.primarySoft,
                      child: Text(
                        profile.firstName.isNotEmpty ? profile.firstName[0].toUpperCase() : 'D',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: QColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: QSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${profile.firstName} ${profile.lastName}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: QColors.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            profile.email,
                            style: const TextStyle(
                              fontSize: 13,
                              color: QColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpacing.md),

              // PIN Card
              QCard(
                padding: const EdgeInsets.all(QSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isArabic ? 'رمز العميل الخاص بك' : 'Your Customer PIN',
                      style: const TextStyle(
                        fontSize: 12,
                        color: QColors.textMuted,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          formattedPin,
                          style: const TextStyle(
                            fontSize: 24,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w900,
                            color: QColors.primary,
                            letterSpacing: 2,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy, color: QColors.primary),
                          onPressed: () {
                            if (profile.userPin != null) {
                              Clipboard.setData(ClipboardData(text: profile.userPin!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    isArabic ? 'تم نسخ الرمز!' : 'PIN copied to clipboard!',
                                  ),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Text(
                      isArabic 
                          ? 'اعرض هذا الرمز للموظف عند الطلب أو للمطالبة بالكوبونات.' 
                          : 'Show this code to the operator to place an order or claim a coupon.',
                      style: const TextStyle(fontSize: 12, color: QColors.textMuted, height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpacing.md),

              // Membership Tiers Card
              QCard(
                padding: const EdgeInsets.all(QSpacing.md),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isArabic ? 'نوع العضوية:' : 'Membership:',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: QColors.text,
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: profile.isPremium ? QColors.primarySoft : QColors.surface2,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            profile.isPremium 
                                ? (isArabic ? 'مميز' : 'Premium')
                                : (isArabic ? 'عادي' : 'Regular'),
                            style: TextStyle(
                              color: profile.isPremium ? QColors.primary : QColors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (!profile.isPremium) ...[
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () {
                              final encodedSubject = Uri.encodeComponent('upgrade');
                              final encodedMessage = Uri.encodeComponent('I would like to upgrade to Premium');
                              context.push('/profile/contact?subject=$encodedSubject&message=$encodedMessage');
                            },
                            child: Text(
                              isArabic ? 'ترقية ←' : 'Upgrade →',
                              style: const TextStyle(
                                color: QColors.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpacing.lg),

              // Editable Fields Card
              QCard(
                padding: const EdgeInsets.all(QSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isArabic ? 'تعديل البيانات' : 'Personal Details',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: QSpacing.md),
                    QInput(
                      label: isArabic ? 'الاسم الأول' : 'First Name',
                      controller: _firstNameController,
                      enabled: !isDemo,
                    ),
                    const SizedBox(height: QSpacing.md),
                    QInput(
                      label: isArabic ? 'اسم العائلة' : 'Last Name',
                      controller: _lastNameController,
                      enabled: !isDemo,
                    ),
                    const SizedBox(height: QSpacing.md),
                    
                    // Gender
                    Text(
                      isArabic ? 'الجنس' : 'Gender',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: QColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: _gender,
                      dropdownColor: QColors.surface,
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
                      items: [
                        DropdownMenuItem(
                          value: 'Male',
                          child: Text(isArabic ? 'ذكر' : 'Male'),
                        ),
                        DropdownMenuItem(
                          value: 'Female',
                          child: Text(isArabic ? 'أنثى' : 'Female'),
                        ),
                        DropdownMenuItem(
                          value: 'Other',
                          child: Text(isArabic ? 'آخر' : 'Other'),
                        ),
                        DropdownMenuItem(
                          value: 'Prefer not to say',
                          child: Text(isArabic ? 'أفضل عدم الإفصاح' : 'Prefer not to say'),
                        ),
                      ],
                      onChanged: isDemo ? null : (val) {
                        setState(() {
                          _gender = val;
                          _isDirty = true;
                        });
                      },
                    ),
                    const SizedBox(height: QSpacing.md),

                    // Birthday
                    Text(
                      isArabic ? 'تاريخ الميلاد' : 'Birthday',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: QColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    GestureDetector(
                      onTap: _selectBirthday,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isDemo ? QColors.surface2 : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: QColors.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _birthday != null
                                  ? '${_birthday!.year}-${_birthday!.month.toString().padLeft(2, '0')}-${_birthday!.day.toString().padLeft(2, '0')}'
                                  : (isArabic ? 'اختر تاريخاً' : 'Select Date'),
                              style: TextStyle(
                                color: _birthday != null ? QColors.text : QColors.textSoft,
                                fontSize: 14,
                              ),
                            ),
                            const Icon(Icons.calendar_today_outlined, size: 18, color: QColors.textSoft),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: QSpacing.md),

                    QInput(
                      label: isArabic ? 'رقم الهاتف' : 'Phone Number',
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      enabled: !isDemo,
                    ),
                    const SizedBox(height: QSpacing.lg),

                    QButton.primary(
                      label: isArabic ? 'حفظ التعديلات' : 'Save Changes',
                      isLoading: _isLoading,
                      onPressed: (_isDirty && !isDemo) ? _handleSave : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpacing.md),

              // Settings/Links List Card
              QCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    // Language Switch
                    ListTile(
                      leading: const Icon(Icons.language_outlined, color: QColors.primary),
                      title: Text(isArabic ? 'اللغة (Language)' : 'Language'),
                      trailing: Text(
                        isArabic ? 'العربية' : 'English',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: QColors.primary),
                      ),
                      onTap: () => languageState.toggle(),
                    ),
                    const Divider(height: 1, color: QColors.divider),
                    // Change password
                    ListTile(
                      leading: const Icon(Icons.lock_outline, color: QColors.primary),
                      title: Text(isArabic ? 'تغيير كلمة المرور' : 'Change Password'),
                      trailing: const Icon(Icons.chevron_right, color: QColors.textSoft),
                      onTap: _showChangePasswordDialog,
                    ),
                    const Divider(height: 1, color: QColors.divider),
                    // Sign out
                    ListTile(
                      leading: const Icon(Icons.logout, color: QColors.dangerFg),
                      title: Text(
                        isArabic ? 'تسجيل الخروج' : 'Sign Out',
                        style: const TextStyle(color: QColors.dangerFg, fontWeight: FontWeight.bold),
                      ),
                      onTap: () async {
                        await supabase.auth.signOut();
                      },
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
