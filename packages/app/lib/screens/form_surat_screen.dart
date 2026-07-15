import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';

class FormSuratScreen extends StatelessWidget {
  final SuratType surat;
  const FormSuratScreen({super.key, required this.surat});

  InputDecoration _dec(String label, String hint) => InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: kSurface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6E8E6))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6E8E6))),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(surat.title, style: const TextStyle(fontSize: 18))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const PrivacyBanner(),
          const SizedBox(height: 20),
          const Text('Keperluan', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          TextField(decoration: _dec('Tujuan pengajuan', 'Contoh: melamar pekerjaan')),
          const SizedBox(height: 16),
          const Text('Rincian', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          TextField(maxLines: 4, decoration: _dec('Jelaskan singkat keperluan Anda', '')),
          const SizedBox(height: 16),
          const Text('Dokumen pendukung (opsional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          _UploadBox(),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Permohonan terkirim. Anda akan diberi tahu saat statusnya berubah.')),
              );
              Navigator.of(context).pop();
            },
            icon: const Icon(Icons.send),
            label: const Text('Kirim permohonan'),
          ),
        ],
      ),
    );
  }
}

class _UploadBox extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return DottedBox(
      child: Column(children: const [
        Icon(Icons.upload_file_outlined, color: kPrimary, size: 30),
        SizedBox(height: 8),
        Text('Pilih file', style: TextStyle(color: kPrimary, fontWeight: FontWeight.w600)),
        SizedBox(height: 2),
        Text('Foto KTP/KK · JPG, PNG, atau PDF', style: TextStyle(color: kTextSecondary, fontSize: 13)),
      ]),
    );
  }
}

class DottedBox extends StatelessWidget {
  final Widget child;
  const DottedBox({super.key, required this.child});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        color: kPrimary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kPrimary.withValues(alpha: 0.3)),
      ),
      child: child,
    );
  }
}
