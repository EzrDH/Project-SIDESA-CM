import 'package:flutter/material.dart';
import 'theme.dart';
import 'app_config.dart';
import 'state/session.dart';
import 'state/session_scope.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

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
        home: Builder(
          builder: (context) => LoginScreen(onLogin: () => _login(context)),
        ),
      ),
    );
  }

  Future<void> _login(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    // Real login when a dev account is configured (--dart-define=SIDESA_ACCOUNT=...).
    // Otherwise enter in demo mode (static data) so the app is always runnable.
    if (AppConfig.devAccountId.isNotEmpty) {
      try {
        await session.login(AppConfig.devAccountId);
      } catch (e) {
        messenger.showSnackBar(SnackBar(content: Text('Masuk mode demo (backend tidak tersedia).')));
      }
    }
    navigator.pushReplacement(MaterialPageRoute(builder: (_) => const MainShell()));
  }
}
