import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../state/session.dart';
import '../state/session_scope.dart';
import 'status_surat_screen.dart';
import 'surat_selesai_screen.dart';

class SuratSayaScreen extends StatefulWidget {
  const SuratSayaScreen({super.key});
  @override
  State<SuratSayaScreen> createState() => _SuratSayaScreenState();
}

class _SuratSayaScreenState extends State<SuratSayaScreen> {
  Future<List<Permohonan>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load(SessionScope.of(context));
  }

  Future<List<Permohonan>> _load(Session session) async {
    if (!session.isLoggedIn) return permohonanSaya; // demo fallback
    final rows = await session.suratSaya();
    return rows
        .map((r) => Permohonan(
              suratTypeTitle(r['type'] as String),
              (r['letterNumber'] as String?) ?? '—',
              fmtTanggal(r['createdAt'] as String),
              statusSuratFrom(r['status'] as String),
            ))
        .toList();
  }

  void _reload() => setState(() => _future = _load(SessionScope.of(context)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Surat saya'), automaticallyImplyLeading: false),
      body: FutureBuilder<List<Permohonan>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return _State(icon: Icons.cloud_off, title: 'Gagal memuat surat', action: 'Coba lagi', onTap: _reload);
          }
          final list = snap.data ?? const [];
          if (list.isEmpty) {
            return const _State(icon: Icons.inbox_outlined, title: 'Belum ada surat', subtitle: 'Mulai dengan Ajukan Surat di Beranda.');
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _SuratCard(p: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _SuratCard extends StatelessWidget {
  final Permohonan p;
  const _SuratCard({required this.p});
  @override
  Widget build(BuildContext context) {
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
  }
}

class _State extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? action;
  final VoidCallback? onTap;
  const _State({required this.icon, required this.title, this.subtitle, this.action, this.onTap});
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
