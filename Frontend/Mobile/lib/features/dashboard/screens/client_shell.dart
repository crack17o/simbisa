import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/features/credit/screens/credit_request_screen.dart';
import 'package:simbisa/features/dashboard/screens/dashboard_screen.dart';
import 'package:simbisa/features/profile/screens/profile_screen.dart';
import 'package:simbisa/features/savings/screens/savings_screen.dart';
import 'package:simbisa/features/scoring/screens/scoring_screen.dart';

class ClientShell extends StatefulWidget {
  final int initialIndex;
  const ClientShell({super.key, this.initialIndex = 0});

  @override
  State<ClientShell> createState() => _ClientShellState();
}

class _ClientShellState extends State<ClientShell> {
  late int _currentIndex;
  double _pageOpacity = 1.0;
  // Incrémenté à chaque activation d'un onglet pour forcer le rebuild (initState) de la page
  final List<int> _refreshKeys = [0, 0, 0, 0, 0];

  static const _pageWidgets = [
    DashboardScreen(),
    CreditRequestScreen(),
    SavingsScreen(),
    ScoringScreen(),
    ProfileScreen(),
  ];

  static const _items = [
    _NavItem(icon: Icons.home_outlined,       activeIcon: Icons.home_rounded,         label: 'Accueil'),
    _NavItem(icon: Icons.credit_card_outlined, activeIcon: Icons.credit_card_rounded,  label: 'Crédit'),
    _NavItem(icon: Icons.savings_outlined,     activeIcon: Icons.savings_rounded,      label: 'Épargne'),
    _NavItem(icon: Icons.bar_chart_outlined,   activeIcon: Icons.bar_chart_rounded,    label: 'Scoring'),
    _NavItem(icon: Icons.person_outline,       activeIcon: Icons.person_rounded,       label: 'Profil'),
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, _pageWidgets.length - 1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedOpacity(
        opacity: _pageOpacity,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        child: IndexedStack(
          index: _currentIndex,
          children: List.generate(_pageWidgets.length, (i) => KeyedSubtree(
            key: ValueKey('tab_${i}_${_refreshKeys[i]}'),
            child: _pageWidgets[i],
          )),
        ),
      ),
      bottomNavigationBar: _buildNavBar(),
    );
  }

  Future<void> _switchTo(int index) async {
    if (index == _currentIndex) return;

    setState(() => _pageOpacity = 0.0);
    await Future.delayed(const Duration(milliseconds: 110));
    if (!mounted) return;
    setState(() {
      _refreshKeys[index]++;
      _currentIndex = index;
      _pageOpacity = 1.0;
    });
  }

  Widget _buildNavBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final panelColor = isDark ? SimbisaColors.panel : SimbisaLightColors.panel;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.06)
        : Colors.black.withValues(alpha: 0.06);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: panelColor,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: borderColor),
            boxShadow: NeuShadow.flatAdaptive(context, blur: 22, offset: 10),
          ),
          child: Row(
            children: List.generate(_items.length, (i) {
              final item = _items[i];
              final active = _currentIndex == i;
              return Expanded(
                child: GestureDetector(
                  onTap: () => _switchTo(i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
                    decoration: active
                        ? BoxDecoration(
                            color: SimbisaColors.or.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: NeuShadow.inset(blur: 6, offset: 2),
                          )
                        : null,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          active ? item.activeIcon : item.icon,
                          size: 22,
                          color: active ? SimbisaColors.or : SimbisaColors.muted,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: SimbisaText.body(
                            9,
                            color: active ? SimbisaColors.or : SimbisaColors.muted,
                            weight: active ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}
