import 'package:flutter/material.dart';
import '../theme.dart';
import '../data/demo.dart';
import '../widgets/ui.dart';
import '../state/session_scope.dart';

const _backendType = {'SP': 'SURAT_PENGANTAR', 'SKTM': 'SKTM', 'SKD': 'DOMISILI'};

class FormSuratScreen extends StatefulWidget {
  final SuratType surat;
  const FormSuratScreen({super.key, required this.surat});

  @override
  State<FormSuratScreen> createState() => _FormSuratScreenState();
}

class _FormSuratScreenState extends State<FormSuratScreen> {
  final _tujuan = TextEditingController();
  final _rincian = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _tujuan.dispose();
    _rincian.dispose();
    super.dispose();
  }

  InputDecoration _dec(String label, String hint) => InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: kSurface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6E8E6))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6E8E6))),
      );

  Future<void> _submit() async {
    final session = SessionScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() => _sending = true);
    try {
      if (session.isLoggedIn) {
        await session.ajukanSurat(_backendType[widget.surat.code]!, {
          'tujuan': _tujuan.text,
          'rincian': _rincian.text,
        });
        messenger.showSnackBar(const SnackBar(content: Text('Permohonan terkirim. Anda akan diberi tahu saat statusnya berubah.')));
      } else {
        messenger.showSnackBar(const SnackBar(content: Text('Mode demo — permohonan disimulasikan.')));
      }
      navigator.pop();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Gagal mengirim permohonan. Coba lagi.')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.surat.title, style: const TextStyle(fontSize: 18))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const PrivacyBanner(),
          const SizedBox(height: 20),
          const Text('Keperluan', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          TextField(controller: _tujuan, decoration: _dec('Tujuan pengajuan', 'Contoh: melamar pekerjaan')),
          const SizedBox(height: 16),
          const Text('Rincian', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          TextField(controller: _rincian, maxLines: 4, decoration: _dec('Jelaskan singkat keperluan Anda', '')),
          const SizedBox(height: 16),
          const Text('Dokumen pendukung (opsional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 8),
          _UploadBox(),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _sending ? null : _submit,
            icon: _sending
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send),
            label: Text(_sending ? 'Mengirim…' : 'Kirim permohonan'),
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
