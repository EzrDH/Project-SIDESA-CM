import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/screens/profil_screen.dart';

void main() {
  testWidgets('logout confirms then calls onLogout', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    var loggedOut = false;
    await tester.pumpWidget(MaterialApp(
      theme: sidesaTheme(),
      home: ProfilScreen(onLogout: () => loggedOut = true),
    ));

    await tester.tap(find.text('Keluar')); // the outlined button
    await tester.pumpAndSettle();
    expect(find.text('Keluar dari akun?'), findsOneWidget); // confirmation dialog

    await tester.tap(find.widgetWithText(FilledButton, 'Keluar')); // dialog action
    await tester.pumpAndSettle();
    expect(loggedOut, isTrue);
  });
}
