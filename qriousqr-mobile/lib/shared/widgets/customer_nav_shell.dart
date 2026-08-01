import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../design_system/colors.dart';
import '../auth_state.dart';
import '../i18n.dart';

// Standardized badge or count notifier for orders
final ValueNotifier<int> activeOrdersCountNotifier = ValueNotifier<int>(0);

class CustomerNavShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const CustomerNavShell({
    super.key,
    required this.navigationShell,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 16.0),
          child: Center(
            child: ListenableBuilder(
              listenable: authState,
              builder: (context, _) {
                final isPremium = authState.isPremium;
                final double width = isPremium ? 320 : 240;

                final List<_NavItem> items = [
                  _NavItem(
                    branchIndex: 0,
                    icon: Icons.home_outlined,
                    selectedIcon: Icons.home,
                    label: T.restaurants,
                  ),
                  if (isPremium)
                    _NavItem(
                      branchIndex: 1,
                      icon: Icons.local_activity_outlined,
                      selectedIcon: Icons.local_activity,
                      label: T.coupons,
                    ),
                  _NavItem(
                    branchIndex: 2,
                    icon: Icons.shopping_bag_outlined,
                    selectedIcon: Icons.shopping_bag,
                    label: T.orders,
                    hasBadge: true,
                  ),
                  _NavItem(
                    branchIndex: 3,
                    icon: Icons.person_outline,
                    selectedIcon: Icons.person,
                    label: T.profile,
                  ),
                ];

                return ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                    child: Container(
                      width: width,
                      height: 56,
                      decoration: BoxDecoration(
                        // ignore: deprecated_member_use
                        color: QColors.surface.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          // ignore: deprecated_member_use
                          color: QColors.border.withOpacity(0.4),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: items.map((item) {
                          final isSelected = navigationShell.currentIndex == item.branchIndex;
                          return _buildTabItem(context, item, isSelected);
                        }).toList(),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem(BuildContext context, _NavItem item, bool isSelected) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => navigationShell.goBranch(item.branchIndex),
      child: SizedBox(
        width: 48,
        height: 48,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              isSelected ? item.selectedIcon : item.icon,
              color: isSelected ? QColors.primary : QColors.textMuted,
              size: 24,
            ),
            if (item.hasBadge)
              ValueListenableBuilder<int>(
                valueListenable: activeOrdersCountNotifier,
                builder: (context, count, _) {
                  if (count <= 0) return const SizedBox.shrink();
                  return Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: QColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$count',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final int branchIndex;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool hasBadge;

  _NavItem({
    required this.branchIndex,
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.hasBadge = false,
  });
}
