import 'package:flutter/material.dart';
import 'theme.dart';
import 'app_config.dart';
import 'state/session.dart';
import 'state/session_scope.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'screens/operator_shell.dart';
import 'screens/kades_shell.dart';

void main() => runApp(SidesaApp(session: Session()));

class SidesaApp extends StatelessWidget {
  final Session session;
  const SidesaApp({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      session: session,
      child: MaterialApp(
        title: 'SIDESA-CM',
        debugShowCheckedModeBanner: false,
        theme: sidesaTheme(),
        home: const RootGate(),
      ),
    );
  }
}

/// Toggles between login and the main app; owns login/logout state.
class RootGate extends StatefulWidget {
  const RootGate({super.key});
  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  bool _loggedIn = false;

  Future<void> _login() async {
    final session = SessionScope.of(context);
    // Real login when a dev account is configured; otherwise demo mode.
    if (AppConfig.devAccountId.isNotEmpty) {
      try {
        await session.login(AppConfig.devAccountId);
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Masuk mode demo (backend tidak tersedia).')),
          );
        }
      }
    }
    if (mounted) setState(() => _loggedIn = true);
  }

  void _logout() {
    SessionScope.of(context).logout();
    setState(() => _loggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) return LoginScreen(onLogin: _login);
    // Each role lands on its own home: operator queue, Kepala Desa signing, or warga shell.
    final session = SessionScope.of(context);
    if (session.isOperator) return OperatorShell(onLogout: _logout);
    if (session.isKades) return KadesShell(onLogout: _logout);
    return MainShell(onLogout: _logout);
  }
}
