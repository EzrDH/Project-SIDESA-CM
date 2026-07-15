import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  final VoidCallback onLogin;
  const LoginScreen({super.key, required this.onLogin});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: cs.primary,
                child: Icon(Icons.account_balance, color: cs.onPrimary, size: 36),
              ),
              const SizedBox(height: 16),
              Text('Desa Cibeteung Muara',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: cs.primary)),
              const Text('Portal Layanan Digital Warga'),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onLogin,
                icon: const Icon(Icons.fingerprint),
                label: const Text('Masuk dengan sidik jari'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: onLogin,
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: const Text('Gunakan PIN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
