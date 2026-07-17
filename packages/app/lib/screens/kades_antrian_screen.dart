import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../state/session.dart';
import '../state/session_scope.dart';
import 'kades_tanda_tangan_screen.dart';

class _Draft {
  final String id;
  final String jenis;
  final String letterNumber;
  final String tanggal;
  const _Draft(this.id, this.jenis, this.letterNumber, this.tanggal);
}

/// The Kepala Desa's queue: letters drafted by the operator, awaiting an
/// on-device ECDSA signature.
class KadesAntrianScreen extends StatefulWidget {
  const KadesAntrianScreen({super.key});
  @override
  State<KadesAntrianScreen> createState() => _KadesAntrianScreenState();
}

class _KadesAntrianScreenState extends State<KadesAntrianScreen> {
  Future<List<_Draft>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load(SessionScope.of(context));
  }

  Future<List<_Draft>> _load(Session session) async {
    if (!session.isLoggedIn) return const []; // no demo drafts
    final rows = await session.antrianTtd();
    return rows
        .map((r) => _Draft(
              r['id'] as String,
              suratTypeTitle(r['type'] as String),
              (r['letterNumber'] as String?) ?? '—',
              fmtTanggal(r['createdAt'] as String),
            ))
        .toList();
  }

  void _reload() => setState(() => _future = _load(SessionScope.of(context)));

  Future<void> _open(_Draft d) async {
    final signed = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => KadesTandaTanganScreen(requestId: d.id, jenis: d.jenis, letterNumber: d.letterNumber),
    ));
    if (signed == true) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<_Draft>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return _State(icon: Icons.cloud_off, title: 'Gagal memuat daftar', action: 'Coba lagi', onTap: _reload);
        }
        final list = snap.data ?? const [];
        if (list.isEmpty) {
          return _State(
            icon: Icons.done_all,
            title: 'Tidak ada surat menunggu',
            subtitle: 'Semua surat sudah ditandatangani.',
            action: 'Muat ulang',
            onTap: _reload,
          );
        }
        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) => _DraftCard(d: list[i], onTap: () => _open(list[i])),
          ),
        );
      },
    );
  }
}

class _DraftCard extends StatelessWidget {
  final _Draft d;
  final VoidCallback onTap;
  const _DraftCard({required this.d, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            TintedIcon(Icons.draw_outlined, color: kPrimary, size: 44),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(d.jenis, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text('No. ${d.letterNumber} · ${d.tanggal}', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 8),
                StatusChip(label: 'Menunggu tanda tangan', color: kProgress, icon: Icons.hourglass_bottom),
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
