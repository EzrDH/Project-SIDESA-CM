import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/screens/login_screen.dart';

void main() {
  testWidgets('login screen shows fingerprint and PIN actions', (tester) async {
    var tapped = false;
    await tester.pumpWidget(MaterialApp(
      theme: sidesaTheme(),
      home: LoginScreen(onLogin: () => tapped = true),
    ));
    expect(find.text('Desa Cibeteung Muara'), findsOneWidget);
    expect(find.text('Masuk dengan sidik jari'), findsOneWidget);
    expect(find.text('Gunakan PIN'), findsOneWidget);

    await tester.tap(find.text('Masuk dengan sidik jari'));
    expect(tapped, isTrue);
  });
}
