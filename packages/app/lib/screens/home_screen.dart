import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final String displayName;
  const HomeScreen({super.key, required this.displayName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Desa Cibeteung Muara')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Halo, $displayName',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          const Text('Selamat datang di layanan digital desa.'),
          const SizedBox(height: 20),
          for (final a in const [
            ('Ajukan Surat', Icons.note_add),
            ('Buat Janji', Icons.event),
            ('Surat Saya', Icons.folder_open),
          ])
            Card(child: ListTile(leading: Icon(a.$2), title: Text(a.$1))),
        ],
      ),
    );
  }
}
