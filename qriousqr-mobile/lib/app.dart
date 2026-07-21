import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'shared/router.dart';

class QriousQrApp extends StatelessWidget {
  const QriousQrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'QriousQR',
      debugShowCheckedModeBanner: false,
      theme: QTheme.lightTheme,
      routerConfig: router,
    );
  }
}
