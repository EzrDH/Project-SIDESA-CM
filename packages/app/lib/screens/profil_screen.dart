import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class ProfilScreen extends StatelessWidget {
  final VoidCallback? onLogout;
  const ProfilScreen({super.key, this.onLogout});

  void _soon(BuildContext context) => ScaffoldMessenger.of(context)
      .showSnackBar(const SnackBar(content: Text('Fitur ini segera hadir.')));

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
          MenuCard(icon: Icons.badge_outlined, title: 'Data diri', onTap: () => _soon(context)),
          const SizedBox(height: 12),
          MenuCard(icon: Icons.lock_outline, title: 'Keamanan (PIN & sidik jari)', onTap: () => _soon(context)),
          const SizedBox(height: 12),
          MenuCard(icon: Icons.notifications_none, title: 'Pengaturan notifikasi', onTap: () => _soon(context)),
          const SizedBox(height: 12),
          MenuCard(icon: Icons.help_outline, title: 'Pusat bantuan', onTap: () => _soon(context)),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context),
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

  void _confirmLogout(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari akun?'),
        content: const Text('Anda perlu masuk lagi untuk menggunakan layanan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFC0392B), minimumSize: const Size(88, 44)),
            onPressed: () {
              Navigator.pop(ctx);
              onLogout?.call();
            },
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}
