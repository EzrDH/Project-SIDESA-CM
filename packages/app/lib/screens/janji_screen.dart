import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';

class JanjiScreen extends StatelessWidget {
  const JanjiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Janji temu'), automaticallyImplyLeading: false),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _buatJanji(context),
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Buat janji'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 90),
        children: [
          const Text('Bertemu Kepala Desa untuk keperluan yang perlu tatap muka.',
              style: TextStyle(color: kTextSecondary, fontSize: 15)),
          const SizedBox(height: 16),
          for (final j in janjiSaya) ...[
            _JanjiCard(janji: j),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  void _buatJanji(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Center(child: Text('Buat janji temu', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18))),
            const SizedBox(height: 20),
            TextField(decoration: InputDecoration(
              labelText: 'Keperluan',
              filled: true, fillColor: kBackground,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            )),
            const SizedBox(height: 12),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.calendar_today_outlined, color: kPrimary),
              title: Text('Pilih tanggal & waktu'),
              trailing: Icon(Icons.chevron_right),
            ),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Ajukan janji')),
          ]),
        ),
      ),
    );
  }
}

class _JanjiCard extends StatelessWidget {
  final Janji janji;
  const _JanjiCard({required this.janji});
  @override
  Widget build(BuildContext context) {
    final terjadwal = janji.status == 'Terjadwal';
    final color = terjadwal ? kSuccess : kProgress;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          TintedIcon(Icons.event, color: color, size: 44),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(janji.keperluan, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(janji.waktu, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 8),
              StatusChip(label: janji.status, color: color, icon: terjadwal ? Icons.check_circle_outline : Icons.hourglass_bottom),
            ]),
          ),
        ]),
      ),
    );
  }
}
