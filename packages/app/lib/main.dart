import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/login_screen.dart';

void main() => runApp(const SidesaApp());

class SidesaApp extends StatelessWidget {
  const SidesaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIDESA-CM',
      debugShowCheckedModeBanner: false,
      theme: sidesaTheme(),
      // Navigation between screens is wired in a later UI plan.
      home: LoginScreen(onLogin: () {}),
    );
  }
}
