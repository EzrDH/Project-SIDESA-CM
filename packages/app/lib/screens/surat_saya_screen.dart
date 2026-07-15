import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import 'status_surat_screen.dart';
import 'surat_selesai_screen.dart';

class SuratSayaScreen extends StatelessWidget {
  const SuratSayaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Surat saya'), automaticallyImplyLeading: false),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: permohonanSaya.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final p = permohonanSaya[i];
          final selesai = p.status == StatusSurat.selesai;
          return Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => selesai ? SuratSelesaiScreen(permohonan: p) : StatusSuratScreen(permohonan: p),
              )),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(children: [
                  TintedIcon(selesai ? Icons.verified_outlined : Icons.description_outlined, color: p.status.color, size: 44),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(p.jenis, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text('${p.nomor} · ${p.tanggal}', style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 8),
                      StatusChip(label: p.status.label, color: p.status.color, icon: p.status.icon),
                    ]),
                  ),
                  const Icon(Icons.chevron_right, color: kTextSecondary),
                ]),
              ),
            ),
          );
        },
      ),
    );
  }
}
