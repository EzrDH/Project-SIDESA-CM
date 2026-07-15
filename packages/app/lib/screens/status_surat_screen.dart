import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';

class StatusSuratScreen extends StatelessWidget {
  final Permohonan permohonan;
  const StatusSuratScreen({super.key, required this.permohonan});

  @override
  Widget build(BuildContext context) {
    // Which step is currently active (0..3).
    final activeStep = switch (permohonan.status) {
      StatusSurat.diajukan => 0,
      StatusSurat.diverifikasi => 1,
      StatusSurat.ditandatangani => 2,
      StatusSurat.selesai => 3,
      StatusSurat.ditolak => 1,
    };
    const steps = [
      ('Diajukan', 'Formulir berhasil dikirim.'),
      ('Diverifikasi operator', 'Operator memeriksa kelengkapan berkas.'),
      ('Ditandatangani Kepala Desa', 'Menunggu tanda tangan digital.'),
      ('Selesai', 'Surat siap diunduh.'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Status permohonan')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(permohonan.jenis, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text('No. ${permohonan.nomor}', style: const TextStyle(fontFeatures: [], color: kTextSecondary)),
              ]),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Riwayat proses', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          for (int i = 0; i < steps.length; i++)
            _TimelineStep(
              title: steps[i].$1,
              desc: steps[i].$2,
              done: i < activeStep,
              active: i == activeStep,
              isLast: i == steps.length - 1,
            ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: kBackground, borderRadius: BorderRadius.circular(14)),
            child: Row(children: const [
              Icon(Icons.notifications_active_outlined, size: 18, color: kTextSecondary),
              SizedBox(width: 10),
              Expanded(child: Text('Anda akan diberi tahu setiap kali status berubah.', style: TextStyle(color: kTextSecondary, fontSize: 14))),
            ]),
          ),
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  final String title, desc;
  final bool done, active, isLast;
  const _TimelineStep({required this.title, required this.desc, required this.done, required this.active, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final color = done ? kSuccess : (active ? kProgress : const Color(0xFFC3C8C4));
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), shape: BoxShape.circle),
            child: Icon(done ? Icons.check : (active ? Icons.hourglass_bottom : Icons.circle_outlined), size: 15, color: color),
          ),
          if (!isLast) Expanded(child: Container(width: 2, color: color.withValues(alpha: 0.3))),
        ]),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: active || done ? kTextPrimary : kTextSecondary)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(color: kTextSecondary, fontSize: 13)),
            ]),
          ),
        ),
      ]),
    );
  }
}
