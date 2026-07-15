import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import 'pilih_surat_screen.dart';
import 'status_surat_screen.dart';

class BerandaScreen extends StatelessWidget {
  const BerandaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final terbaru = permohonanSaya.first;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Row(children: [
          const CircleAvatar(
            radius: 22,
            backgroundColor: kPrimary,
            child: Icon(Icons.account_balance, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('Desa Cibeteung Muara', style: TextStyle(fontWeight: FontWeight.w700, color: kPrimary, fontSize: 15)),
              Text('Layanan Digital', style: TextStyle(color: kTextSecondary, fontSize: 13)),
            ]),
          ),
          IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none)),
        ]),
        const SizedBox(height: 20),
        Text('Halo, Budi 👋', style: Theme.of(context).textTheme.headlineMedium),
        const Text('Mau mengurus apa hari ini?', style: TextStyle(color: kTextSecondary, fontSize: 15)),
        const SizedBox(height: 20),
        BigActionCard(
          title: 'Ajukan Surat',
          subtitle: 'Buat permohonan surat baru',
          icon: Icons.note_add_outlined,
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PilihSuratScreen())),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _MiniAction(icon: Icons.event_available_outlined, label: 'Buat Janji', color: kPrimary, onTap: () {})),
          const SizedBox(width: 12),
          Expanded(child: _MiniAction(icon: Icons.folder_open_outlined, label: 'Surat Saya', color: kProgress, onTap: () {})),
        ]),
        const SizedBox(height: 24),
        const Text('Permohonan terakhir', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: kTextPrimary)),
        const SizedBox(height: 10),
        Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => StatusSuratScreen(permohonan: terbaru))),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(terbaru.jenis, style: Theme.of(context).textTheme.titleMedium)),
                  StatusChip(label: terbaru.status.label, color: terbaru.status.color, icon: terbaru.status.icon),
                ]),
                const SizedBox(height: 6),
                Text('Diajukan ${terbaru.tanggal}', style: Theme.of(context).textTheme.bodyMedium),
                const Divider(height: 24),
                Row(children: const [
                  Icon(Icons.info_outline, size: 18, color: kTextSecondary),
                  SizedBox(width: 8),
                  Expanded(child: Text('Sedang diperiksa oleh operator desa.', style: TextStyle(color: kTextSecondary, fontSize: 14))),
                ]),
              ]),
            ),
          ),
        ),
      ],
    );
  }
}

class _MiniAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _MiniAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18),
          child: Column(children: [
            TintedIcon(icon, color: color, size: 44),
            const SizedBox(height: 10),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          ]),
        ),
      ),
    );
  }
}
