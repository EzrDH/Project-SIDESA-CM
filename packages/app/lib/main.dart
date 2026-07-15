import 'package:flutter/material.dart';
import 'theme.dart';

void main() => runApp(const SidesaApp());

class SidesaApp extends StatelessWidget {
  const SidesaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIDESA-CM',
      debugShowCheckedModeBanner: false,
      theme: sidesaTheme(),
      home: Scaffold(
        appBar: AppBar(title: const Text('Desa Cibeteung Muara')),
        body: const Center(child: Text('SIDESA-CM')),
      ),
    );
  }
}
