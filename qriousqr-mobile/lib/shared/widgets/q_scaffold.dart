import 'package:flutter/material.dart';
import '../../design_system/colors.dart';

class QScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final bool useSafeArea;

  const QScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.useSafeArea = true,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = body;
    if (useSafeArea) {
      content = SafeArea(child: content);
    }

    return Scaffold(
      backgroundColor: QColors.background,
      appBar: appBar,
      body: content,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}
