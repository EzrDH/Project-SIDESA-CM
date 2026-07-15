import 'package:flutter/material.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import 'form_surat_screen.dart';

class PilihSuratScreen extends StatelessWidget {
  const PilihSuratScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pilih jenis surat')),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: suratTypes.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final s = suratTypes[i];
          return MenuCard(
            icon: s.icon,
            title: s.title,
            subtitle: s.desc,
            trailing: s.estimasi,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => FormSuratScreen(surat: s))),
          );
        },
      ),
    );
  }
}
