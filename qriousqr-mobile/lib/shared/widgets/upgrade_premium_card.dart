import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/colors.dart';
import '../../design_system/components/q_button.dart';
import '../../design_system/components/q_card.dart';
import '../../design_system/spacing.dart';
import '../language_state.dart';

class UpgradePremiumCard extends StatelessWidget {
  const UpgradePremiumCard({super.key});

  @override
  Widget build(BuildContext context) {
    final isArabic = languageState.isArabic;

    final badgeText = isArabic ? 'مميز' : 'PREMIUM';
    final titleText = isArabic ? 'تفعيل كوبونات BOGO' : 'Unlock BOGO coupons';
    final bodyText = isArabic 
        ? 'يحصل عملاء مميزون على 3 كوبونات "اشتر واحد واحصل على الآخر مجاناً" لكل مطعم، كل عام.'
        : 'Premium customers get 3 buy-one-get-one coupons per restaurant, every year. Available across every restaurant on QriousQR.';
    final buttonText = isArabic ? 'اتصل بنا للترقية' : 'Contact us to upgrade';

    return QCard(
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left border stripe
            Container(
              width: 4,
              color: QColors.primary,
            ),
            // Card Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(QSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Premium badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: QColors.primarySoft,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        badgeText,
                        style: const TextStyle(
                          color: QColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: QSpacing.xs),
                    Text(
                      titleText,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: QColors.text,
                      ),
                    ),
                    const SizedBox(height: QSpacing.xs),
                    Text(
                      bodyText,
                      style: const TextStyle(
                        fontSize: 13,
                        color: QColors.textMuted,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: QSpacing.md),
                    QButton.primary(
                      label: buttonText,
                      isFullWidth: true,
                      onPressed: () {
                        final encodedSubject = Uri.encodeComponent('upgrade');
                        final encodedMessage = Uri.encodeComponent('I would like to upgrade to Premium');
                        context.push('/profile/contact?subject=$encodedSubject&message=$encodedMessage');
                      },
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
