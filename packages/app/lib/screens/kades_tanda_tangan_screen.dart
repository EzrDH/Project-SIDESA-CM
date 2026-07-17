import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/ui.dart';
import '../state/session.dart';
import '../state/session_scope.dart';

/// Presents the canonical letter to the Kepala Desa and signs it on-device
/// with ECDSA P-384. The private key never leaves the device; the server only
/// receives (and verifies) the signature.
class KadesTandaTanganScreen extends StatefulWidget {
  final String requestId;
  final String jenis;
  final String letterNumber;
  const KadesTandaTanganScreen({super.key, required this.requestId, required this.jenis, required this.letterNumber});

  @override
  State<KadesTandaTanganScreen> createState() => _KadesTandaTanganScreenState();
}

class _KadesTandaTanganScreenState extends State<KadesTandaTanganScreen> {
  Future<Map<String, dynamic>>? _forSigning;
  Map<String, dynamic>? _signed;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _forSigning ??= SessionScope.of(context).ambilUntukTtd(widget.requestId);
  }

  Future<void> _sign(String canonicalContent) async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final res = await session.tandatanganiSurat(widget.requestId, canonicalContent);
      setState(() => _signed = res);
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Gagal menandatangani. Coba lagi.')));
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.jenis, style: const TextStyle(fontSize: 17)),
          Text('No. ${widget.letterNumber}', style: const TextStyle(fontSize: 13, color: kTextSecondary, fontWeight: FontWeight.w400)),
        ]),
      ),
      body: SafeArea(child: _signed != null ? _buildSigned() : _buildForSigning()),
    );
  }

  Widget _buildForSigning() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _forSigning,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError || snap.data == null) {
          return const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Gagal memuat draft surat.')));
        }
        final content = snap.data!['canonicalContent'] as String;
        final hash = (snap.data!['documentHash'] as String?) ?? '';
        return Column(children: [
          Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: kPrimary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(16)),
                child: Row(children: const [
                  Icon(Icons.lock_outline, color: kPrimary),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('Ditandatangani dengan ECDSA P-384 di perangkat ini. Kunci privat Anda tidak pernah dikirim ke server.',
                        style: TextStyle(color: kTextPrimary, fontSize: 14, height: 1.3)),
                  ),
                ]),
              ),
              const SizedBox(height: 16),
              const Text('Isi surat', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(16), border: Border.all(color: kTextSecondary.withValues(alpha: 0.18))),
                child: Text(content, style: const TextStyle(fontFamily: 'monospace', fontSize: 13, height: 1.5)),
              ),
              if (hash.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(children: [
                  const Icon(Icons.tag, size: 15, color: kTextSecondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text('Hash dokumen (SHA-384): ${hash.substring(0, hash.length >= 24 ? 24 : hash.length)}…',
                        style: const TextStyle(color: kTextSecondary, fontSize: 12, fontFamily: 'monospace')),
                  ),
                ]),
              ],
            ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _busy ? null : () => _sign(content),
                icon: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.draw),
                label: Text(_busy ? 'Menandatangani…' : 'Tanda tangani'),
              ),
            ),
          ),
        ]);
      },
    );
  }

  Widget _buildSigned() {
    final qr = (_signed!['qrToken'] as String?) ?? '';
    final nomor = (_signed!['letterNumber'] as String?) ?? widget.letterNumber;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const CapDigital(),
          const SizedBox(height: 24),
          Text('Surat berhasil ditandatangani', style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text('No. $nomor', style: const TextStyle(color: kTextSecondary, fontSize: 15)),
          const SizedBox(height: 8),
          const Text('Tanda tangan ECDSA telah diverifikasi server. Surat kini sah dan dapat diunduh warga.',
              style: TextStyle(color: kTextSecondary, fontSize: 14, height: 1.4), textAlign: TextAlign.center),
          if (qr.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Token verifikasi: $qr', style: const TextStyle(color: kTextSecondary, fontSize: 12, fontFamily: 'monospace')),
          ],
          const SizedBox(height: 28),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Selesai')),
          ),
        ]),
      ),
    );
  }
}
