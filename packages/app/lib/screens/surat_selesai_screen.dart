import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../pdf/letter_pdf.dart';
import '../state/session.dart';
import '../state/session_scope.dart';

class SuratSelesaiScreen extends StatefulWidget {
  final Permohonan permohonan;
  const SuratSelesaiScreen({super.key, required this.permohonan});

  @override
  State<SuratSelesaiScreen> createState() => _SuratSelesaiScreenState();
}

class _SuratSelesaiScreenState extends State<SuratSelesaiScreen> {
  bool _busy = false;

  Permohonan get permohonan => widget.permohonan;

  /// Fetch the publicly-verified content and hand it to the PDF renderer.
  Future<void> _withPdf(Future<void> Function(Uint8List bytes, String name) sink) async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final token = permohonan.qrToken;
    if (token == null || !session.isLoggedIn) {
      messenger.showSnackBar(const SnackBar(content: Text('Surat demo — PDF tersedia untuk surat yang sudah ditandatangani.')));
      return;
    }
    setState(() => _busy = true);
    try {
      final v = await session.suratTerverifikasi(token);
      if (v['valid'] != true) throw Exception('invalid');
      final bytes = await buildLetterPdf(
        title: permohonan.jenis,
        letterNumber: (v['letterNumber'] as String?) ?? permohonan.nomor,
        canonicalContent: (v['content'] as String?) ?? '',
        signer: (v['signer'] as String?) ?? 'Kepala Desa',
        signedAt: _fmt(v['signedAt'] as String?),
        verifyUrl: session.verifyUrl(token),
      );
      await sink(bytes, 'Surat-${permohonan.nomor.replaceAll('/', '-')}.pdf');
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Gagal menyiapkan PDF. Coba lagi.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _fmt(String? iso) {
    final d = DateTime.tryParse(iso ?? '')?.toLocal();
    return d == null ? '-' : fmtTanggal(d.toIso8601String());
  }

  Future<void> _unduh() => _withPdf((bytes, name) => Printing.layoutPdf(onLayout: (_) async => bytes, name: name));
  Future<void> _bagikan() async {
    await _withPdf((bytes, name) async {
      await Printing.sharePdf(bytes: bytes, filename: name);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Surat selesai')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: kSuccess.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(16)),
            child: Row(children: const [
              Icon(Icons.check_circle, color: kSuccess),
              SizedBox(width: 12),
              Expanded(child: Text('Dokumen sah & siap digunakan.', style: TextStyle(color: kSuccess, fontWeight: FontWeight.w600, fontSize: 15))),
            ]),
          ),
          const SizedBox(height: 16),
          // Paper-like document preview with the Cap Digital seal.
          Stack(children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 60),
              decoration: BoxDecoration(
                color: const Color(0xFFFBF8F1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE8E1D2)),
              ),
              child: Column(children: [
                const Text('PEMERINTAH DESA CIBETEUNG MUARA',
                    textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF2A2A2A))),
                const Text('Kecamatan Ciseeng, Kabupaten Bogor', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Color(0xFF6B6450))),
                const Divider(height: 20, color: Color(0xFFC9BFA6)),
                Text(permohonan.jenis.toUpperCase(),
                    textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF2A2A2A))),
                Text('Nomor: ${permohonan.nomor}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Color(0xFF6B6450))),
                const SizedBox(height: 14),
                const Text(
                  'Yang bertanda tangan di bawah ini menerangkan bahwa nama tersebut benar terdaftar sebagai penduduk Desa Cibeteung Muara.',
                  style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF3A352B)),
                ),
              ]),
            ),
            const Positioned(right: 18, bottom: 8, child: CapDigital()),
          ]),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _busy ? null : _unduh,
                icon: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.download),
                label: Text(_busy ? 'Menyiapkan…' : 'Unduh PDF'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _busy ? null : _bagikan,
                icon: const Icon(Icons.share_outlined),
                label: const Text('Bagikan'),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          const Center(
            child: Text('Keaslian dapat dicek publik lewat QR pada surat.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
