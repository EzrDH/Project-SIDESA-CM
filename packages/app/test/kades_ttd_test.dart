import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/state/session.dart';
import 'package:sidesa_app/state/session_scope.dart';
import 'package:sidesa_app/screens/kades_antrian_screen.dart';

void main() {
  testWidgets('KaDes signs a drafted letter end-to-end', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    String? signedSignature;
    var queueCalls = 0;
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/letters/signing-queue')) {
        queueCalls++;
        final body = queueCalls == 1
            ? [
                {'id': 'r1', 'type': 'DOMISILI', 'letterNumber': '43/SKD/2026', 'createdAt': '2026-07-17T00:00:00.000Z'},
              ]
            : [];
        return http.Response(jsonEncode(body), 200);
      }
      if (req.url.path.endsWith('/letters/r1/for-signing')) {
        return http.Response(jsonEncode({'canonicalContent': 'SURAT KETERANGAN DOMISILI\nNomor: 43/SKD/2026', 'documentHash': 'deadbeef'}), 200);
      }
      if (req.url.path.endsWith('/letters/r1/sign')) {
        signedSignature = (jsonDecode(req.body) as Map<String, dynamic>)['signature'] as String;
        return http.Response(jsonEncode({'letterNumber': '43/SKD/2026', 'qrToken': 'tok123'}), 201);
      }
      return http.Response('not found', 404);
    });

    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(generateKeyPair().privateKey));
    session.token = 'x';
    session.role = 'KADES';
    session.api.authToken = 'x';

    await tester.pumpWidget(SessionScope(
      session: session,
      child: const MaterialApp(home: Scaffold(body: KadesAntrianScreen())),
    ));
    await tester.pumpAndSettle();

    // The drafted letter appears with its number.
    expect(find.textContaining('43/SKD/2026'), findsWidgets);

    // Open the signing screen.
    await tester.tap(find.text('Surat Keterangan Domisili'));
    await tester.pumpAndSettle();
    expect(find.textContaining('SURAT KETERANGAN DOMISILI'), findsOneWidget);

    // Sign it: produces a signature and shows the signed result.
    await tester.tap(find.text('Tanda tangani'));
    await tester.pumpAndSettle();

    expect(signedSignature, isNotNull);
    expect(signedSignature!.length, greaterThan(0));
    expect(find.textContaining('ditandatangani'), findsWidgets);
  });
}
