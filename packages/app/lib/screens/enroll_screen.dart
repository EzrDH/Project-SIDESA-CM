import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';
import '../state/device_identity.dart';
import '../state/session_scope.dart';

/// First-run screen: the resident types the one-time code the village operator
/// handed over after checking their KTP. Claiming it binds this device's key to
/// that verified identity — the device never asserts who it belongs to.
class EnrollScreen extends StatefulWidget {
  final ValueChanged<DeviceIdentity> onEnrolled;
  const EnrollScreen({super.key, required this.onEnrolled});

  @override
  State<EnrollScreen> createState() => _EnrollScreenState();
}

class _EnrollScreenState extends State<EnrollScreen> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final session = SessionScope.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final identity = await session.daftarPerangkat(_code.text);
      widget.onEnrolled(identity);
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Kode tidak valid atau sudah kedaluwarsa. Minta kode baru ke petugas desa.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          children: [
            Center(
              child: Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle),
                child: const Icon(Icons.how_to_reg, color: Colors.white, size: 42),
              ),
            ),
            const SizedBox(height: 24),
            const Text('Daftarkan Perangkat',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: kPrimary)),
            const SizedBox(height: 8),
            const Text(
              'Masukkan kode pendaftaran yang diberikan petugas Desa Cibeteung Muara '
              'setelah KTP Anda diperiksa.',
              textAlign: TextAlign.center,
              style: TextStyle(color: kTextSecondary, fontSize: 15, height: 1.4),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _code,
              enabled: !_busy,
              textCapitalization: TextCapitalization.characters,
              textAlign: TextAlign.center,
              maxLength: 9, // ABCD-EFGH
              style: const TextStyle(fontSize: 22, letterSpacing: 4, fontWeight: FontWeight.w600),
              inputFormatters: [UpperCaseFormatter()],
              decoration: InputDecoration(
                hintText: 'ABCD-EFGH',
                counterText: '',
                filled: true,
                fillColor: kBackground,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFC0392B), fontSize: 14)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Mendaftarkan…' : 'Daftarkan perangkat'),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: kPrimary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(16)),
              child: Row(children: const [
                Icon(Icons.lock_outline, color: kPrimary),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Kunci rahasia dibuat dan disimpan di dalam perangkat ini — tidak pernah dikirim ke server.',
                    style: TextStyle(color: kTextPrimary, fontSize: 13.5, height: 1.3),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

/// Codes are shown in upper case; keep what the user types consistent with that.
class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      TextEditingValue(text: newValue.text.toUpperCase(), selection: newValue.selection);
}
