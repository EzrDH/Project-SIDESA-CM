import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class ProfilScreen extends StatelessWidget {
  const ProfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profil'), automaticallyImplyLeading: false),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(children: [
                const CircleAvatar(radius: 40, backgroundColor: kPrimary, child: Icon(Icons.person, color: Colors.white, size: 44)),
                const SizedBox(height: 12),
                Text('Budi Santoso', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                const StatusChip(label: 'Akun terverifikasi', color: kSuccess, icon: Icons.verified_user_outlined),
              ]),
            ),
          ),
          const SizedBox(height: 20),
          const MenuCard(icon: Icons.badge_outlined, title: 'Data diri', onTap: _noop),
          const SizedBox(height: 12),
          const MenuCard(icon: Icons.lock_outline, title: 'Keamanan (PIN & sidik jari)', onTap: _noop),
          const SizedBox(height: 12),
          const MenuCard(icon: Icons.notifications_none, title: 'Pengaturan notifikasi', onTap: _noop),
          const SizedBox(height: 12),
          const MenuCard(icon: Icons.help_outline, title: 'Pusat bantuan', onTap: _noop),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFC0392B),
              side: const BorderSide(color: Color(0x33C0392B)),
            ),
            icon: const Icon(Icons.logout),
            label: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}

void _noop() {}
