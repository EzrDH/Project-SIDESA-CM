import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../state/session.dart';
import '../state/session_scope.dart';

/// Operator's work queue: letter requests submitted by warga, awaiting
/// verification. Verifying drafts the letter (assigns a number) so the
/// Kepala Desa can sign it; rejecting closes the request.
class OperatorAntrianScreen extends StatefulWidget {
  const OperatorAntrianScreen({super.key});
  @override
  State<OperatorAntrianScreen> createState() => _OperatorAntrianScreenState();
}

class _OperatorAntrianScreenState extends State<OperatorAntrianScreen> {
  Future<List<Antrian>>? _future;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load(SessionScope.of(context));
  }

  Future<List<Antrian>> _load(Session session) async {
    if (!session.isLoggedIn) return antrianDemo; // demo fallback
    final rows = await session.antrianSurat();
    return rows
        .map((r) => Antrian(
              r['id'] as String,
              suratTypeTitle(r['type'] as String),
              fmtTanggal(r['createdAt'] as String),
            ))
        .toList();
  }

  void _reload() => setState(() => _future = _load(SessionScope.of(context)));

  Future<void> _verifikasi(Antrian a) async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final res = await session.verifikasiSurat(a.id);
      messenger.showSnackBar(SnackBar(
          content: Text('Terverifikasi. Nomor surat ${res['letterNumber'] ?? '—'} — siap ditandatangani Kepala Desa.')));
      _reload();
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Gagal memverifikasi. Coba lagi.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _tolak(Antrian a) async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Tolak permohonan?'),
        content: Text('${a.jenis} akan ditolak dan tidak diproses lebih lanjut.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Tolak')),
        ],
      ),
    );
    if (yes != true) return;
    setState(() => _busy = true);
    try {
      await session.tolakSurat(a.id);
      messenger.showSnackBar(const SnackBar(content: Text('Permohonan ditolak.')));
      _reload();
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Gagal menolak. Coba lagi.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Antrian>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return _State(icon: Icons.cloud_off, title: 'Gagal memuat antrean', action: 'Coba lagi', onTap: _reload);
        }
        final list = snap.data ?? const [];
        if (list.isEmpty) {
          return _State(
            icon: Icons.inbox_outlined,
            title: 'Antrean kosong',
            subtitle: 'Belum ada permohonan yang menunggu verifikasi.',
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
            itemBuilder: (context, i) => _AntrianCard(
              a: list[i],
              busy: _busy,
              onVerifikasi: () => _verifikasi(list[i]),
              onTolak: () => _tolak(list[i]),
            ),
          ),
        );
      },
    );
  }
}

class _AntrianCard extends StatelessWidget {
  final Antrian a;
  final bool busy;
  final VoidCallback onVerifikasi;
  final VoidCallback onTolak;
  const _AntrianCard({required this.a, required this.busy, required this.onVerifikasi, required this.onTolak});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            TintedIcon(Icons.assignment_outlined, color: kProgress, size: 44),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(a.jenis, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text('Diajukan ${a.tanggal}', style: Theme.of(context).textTheme.bodyMedium),
              ]),
            ),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy ? null : onTolak,
                icon: const Icon(Icons.close, size: 18),
                label: const Text('Tolak'),
                style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFC0392B)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: busy ? null : onVerifikasi,
                icon: const Icon(Icons.check, size: 18),
                label: const Text('Verifikasi'),
              ),
            ),
          ]),
        ]),
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
