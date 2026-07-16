import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';

class SuratSelesaiScreen extends StatelessWidget {
  final Permohonan permohonan;
  const SuratSelesaiScreen({super.key, required this.permohonan});

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
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Mengunduh PDF surat…')),
                ),
                icon: const Icon(Icons.download),
                label: const Text('Unduh PDF'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Membagikan surat…')),
                ),
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
