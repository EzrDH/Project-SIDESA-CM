import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../state/session.dart';
import '../state/session_scope.dart';

class JanjiScreen extends StatefulWidget {
  const JanjiScreen({super.key});
  @override
  State<JanjiScreen> createState() => _JanjiScreenState();
}

class _JanjiScreenState extends State<JanjiScreen> {
  Future<List<Janji>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load(SessionScope.of(context));
  }

  Future<List<Janji>> _load(Session session) async {
    if (!session.isLoggedIn) return janjiSaya; // demo fallback
    final rows = await session.janjiSaya();
    return rows.map((r) {
      final slot = (r['confirmedSlot'] as String?) ?? (r['requestedSlot'] as String);
      return Janji(r['purpose'] as String, fmtWaktu(slot), janjiStatusLabel(r['status'] as String));
    }).toList();
  }

  void _reload() => setState(() => _future = _load(SessionScope.of(context)));

  Future<void> _openSheet() async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => _BuatJanjiSheet(session: session, messenger: messenger),
    );
    if (submitted == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Janji temu'), automaticallyImplyLeading: false),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openSheet,
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Buat janji'),
      ),
      body: FutureBuilder<List<Janji>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return _EmptyOrError(icon: Icons.cloud_off, title: 'Gagal memuat janji', action: 'Coba lagi', onTap: _reload);
          }
          final list = snap.data ?? const [];
          if (list.isEmpty) {
            return const _EmptyOrError(icon: Icons.event_busy_outlined, title: 'Belum ada janji', subtitle: 'Ketuk “Buat janji” untuk membuat.');
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 90),
              children: [
                const Text('Bertemu Kepala Desa untuk keperluan yang perlu tatap muka.',
                    style: TextStyle(color: kTextSecondary, fontSize: 15)),
                const SizedBox(height: 16),
                for (final j in list) ...[_JanjiCard(janji: j), const SizedBox(height: 12)],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _BuatJanjiSheet extends StatefulWidget {
  final Session session;
  final ScaffoldMessengerState messenger;
  const _BuatJanjiSheet({required this.session, required this.messenger});
  @override
  State<_BuatJanjiSheet> createState() => _BuatJanjiSheetState();
}

class _BuatJanjiSheetState extends State<_BuatJanjiSheet> {
  final _purpose = TextEditingController();
  DateTime? _slot;
  bool _sending = false;

  @override
  void dispose() {
    _purpose.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      initialDate: now.add(const Duration(days: 1)),
    );
    if (picked != null) setState(() => _slot = DateTime(picked.year, picked.month, picked.day, 9));
  }

  Future<void> _submit() async {
    setState(() => _sending = true);
    final slot = _slot ?? DateTime.now().add(const Duration(days: 1));
    try {
      if (widget.session.isLoggedIn) {
        await widget.session.buatJanji(
          _purpose.text.isEmpty ? 'Konsultasi' : _purpose.text,
          slot.toUtc().toIso8601String(),
        );
      }
      widget.messenger.showSnackBar(const SnackBar(content: Text('Janji temu diajukan. Menunggu konfirmasi.')));
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      widget.messenger.showSnackBar(const SnackBar(content: Text('Gagal mengajukan janji. Coba lagi.')));
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final slotLabel = _slot == null ? 'Pilih tanggal & waktu' : fmtWaktu(_slot!.toIso8601String());
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Center(child: Text('Buat janji temu', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18))),
          const SizedBox(height: 20),
          TextField(
            controller: _purpose,
            decoration: InputDecoration(
              labelText: 'Keperluan',
              filled: true,
              fillColor: kBackground,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today_outlined, color: kPrimary),
            title: Text(slotLabel),
            trailing: const Icon(Icons.chevron_right),
            onTap: _pickDate,
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _sending ? null : _submit,
            child: Text(_sending ? 'Mengirim…' : 'Ajukan janji'),
          ),
        ]),
      ),
    );
  }
}

class _JanjiCard extends StatelessWidget {
  final Janji janji;
  const _JanjiCard({required this.janji});
  @override
  Widget build(BuildContext context) {
    final terjadwal = janji.status == 'Terjadwal' || janji.status == 'Selesai';
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

class _EmptyOrError extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? action;
  final VoidCallback? onTap;
  const _EmptyOrError({required this.icon, required this.title, this.subtitle, this.action, this.onTap});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 56, color: kTextSecondary),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
          ],
          if (action != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onTap, child: Text(action!)),
          ],
        ]),
      ),
    );
  }
}
