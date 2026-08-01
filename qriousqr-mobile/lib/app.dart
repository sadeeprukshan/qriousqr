import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'shared/router.dart';
import 'shared/language_state.dart';

class QriousQrApp extends StatelessWidget {
  const QriousQrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: languageState,
      builder: (context, _) {
        return MaterialApp.router(
          title: 'QriousQR',
          debugShowCheckedModeBanner: false,
          theme: QTheme.lightTheme,
          routerConfig: router,
          locale: languageState.locale,
          supportedLocales: const [Locale('en'), Locale('ar')],
          builder: (context, child) {
            return Directionality(
              textDirection: languageState.textDirection,
              child: child ?? const SizedBox.shrink(),
            );
          },
        );
      },
    );
  }
}

