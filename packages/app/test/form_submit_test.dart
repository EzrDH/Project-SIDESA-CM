import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/data/demo.dart';
import 'package:sidesa_app/state/session.dart';
import 'package:sidesa_app/state/session_scope.dart';
import 'package:sidesa_app/screens/form_surat_screen.dart';

void main() {
  testWidgets('submitting the form posts to /letters/request when logged in', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    String? postedPath;
    Map<String, dynamic>? postedBody;
    final mock = MockClient((req) async {
      postedPath = req.url.path;
      postedBody = jsonDecode(req.body) as Map<String, dynamic>;
      return http.Response(jsonEncode({'id': 'req-1'}), 201);
    });

    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(generateKeyPair().privateKey));
    session.token = 'jwt'; // mark logged in
    session.api.authToken = 'jwt';

    final skd = suratTypes.firstWhere((s) => s.code == 'SKD');

    await tester.pumpWidget(SessionScope(
      session: session,
      child: MaterialApp(
        theme: sidesaTheme(),
        home: Builder(
          builder: (c) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => Navigator.of(c).push(MaterialPageRoute(builder: (_) => FormSuratScreen(surat: skd))),
                child: const Text('buka'),
              ),
            ),
          ),
        ),
      ),
    ));

    await tester.tap(find.text('buka'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'melamar kerja');
    await tester.tap(find.text('Kirim permohonan'));
    await tester.pumpAndSettle();

    expect(postedPath, contains('/letters/request'));
    expect(postedBody?['type'], 'DOMISILI');
    expect((postedBody?['formData'] as Map)['tujuan'], 'melamar kerja');
  });
}
