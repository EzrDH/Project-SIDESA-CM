import 'package:flutter/material.dart';
import 'beranda_screen.dart';
import 'surat_saya_screen.dart';
import 'janji_screen.dart';
import 'profil_screen.dart';

class MainShell extends StatefulWidget {
  final VoidCallback? onLogout;
  const MainShell({super.key, this.onLogout});
  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  void _goToTab(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final pages = [
      BerandaScreen(onGoToTab: _goToTab),
      const SuratSayaScreen(),
      const JanjiScreen(),
      ProfilScreen(onLogout: widget.onLogout),
    ];
    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goToTab,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Beranda'),
          NavigationDestination(icon: Icon(Icons.description_outlined), selectedIcon: Icon(Icons.description), label: 'Surat'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Janji'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
