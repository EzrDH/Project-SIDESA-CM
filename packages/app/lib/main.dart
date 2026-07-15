import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() => runApp(const SidesaApp());

class SidesaApp extends StatelessWidget {
  const SidesaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIDESA-CM',
      debugShowCheckedModeBanner: false,
      theme: sidesaTheme(),
      home: Builder(
        builder: (context) => LoginScreen(
          onLogin: () => Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const MainShell()),
          ),
        ),
      ),
    );
  }
}
