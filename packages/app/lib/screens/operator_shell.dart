import 'package:flutter/material.dart';
import '../theme.dart';
import 'operator_antrian_screen.dart';

/// Home shell for an OPERATOR account: the verification queue plus logout.
class OperatorShell extends StatelessWidget {
  final VoidCallback? onLogout;
  const OperatorShell({super.key, this.onLogout});

  Future<void> _confirmLogout(BuildContext context) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Keluar?'),
        content: const Text('Anda akan keluar dari akun operator.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Keluar')),
        ],
      ),
    );
    if (yes == true) onLogout?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Verifikasi Surat'),
          Text('Operator Desa', style: TextStyle(fontSize: 13, color: kTextSecondary, fontWeight: FontWeight.w400)),
        ]),
        actions: [
          IconButton(
            tooltip: 'Keluar',
            icon: const Icon(Icons.logout),
            onPressed: () => _confirmLogout(context),
          ),
        ],
      ),
      body: const SafeArea(child: OperatorAntrianScreen()),
    );
  }
}
