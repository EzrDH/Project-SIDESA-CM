import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/screens/main_shell.dart';
import 'package:sidesa_app/screens/beranda_screen.dart';
import 'package:sidesa_app/screens/pilih_surat_screen.dart';
import 'package:sidesa_app/screens/surat_selesai_screen.dart';
import 'package:sidesa_app/data/demo.dart';

Widget _wrap(Widget child) => MaterialApp(theme: sidesaTheme(), home: child);

void main() {
  testWidgets('beranda shows the primary action and greeting', (tester) async {
    await tester.pumpWidget(_wrap(const Scaffold(body: BerandaScreen())));
    expect(find.text('Ajukan Surat'), findsOneWidget);
    expect(find.textContaining('Halo, Budi'), findsOneWidget);
    expect(find.text('Permohonan terakhir'), findsOneWidget);
  });

  testWidgets('pilih surat lists the three letter types', (tester) async {
    await tester.pumpWidget(_wrap(const PilihSuratScreen()));
    expect(find.text('Surat Pengantar'), findsOneWidget);
    expect(find.text('Surat Keterangan Tidak Mampu'), findsOneWidget);
    expect(find.text('Surat Keterangan Domisili'), findsOneWidget);
  });

  testWidgets('main shell has the four bottom-nav destinations', (tester) async {
    await tester.pumpWidget(_wrap(const MainShell()));
    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Surat'), findsOneWidget);
    expect(find.text('Janji'), findsOneWidget);
    expect(find.text('Profil'), findsOneWidget);
  });

  testWidgets('surat selesai shows the digital seal', (tester) async {
    await tester.pumpWidget(_wrap(SuratSelesaiScreen(
      permohonan: permohonanSaya.firstWhere((p) => p.status == StatusSurat.selesai),
    )));
    expect(find.text('TERVERIFIKASI'), findsOneWidget);
    expect(find.text('Unduh PDF'), findsOneWidget);
  });
}
