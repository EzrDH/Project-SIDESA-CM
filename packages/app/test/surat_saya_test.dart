import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/state/session.dart';
import 'package:sidesa_app/state/session_scope.dart';
import 'package:sidesa_app/screens/surat_saya_screen.dart';

void main() {
  testWidgets('Surat Saya loads the warga letters from the server', (tester) async {
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/letters/mine')) {
        return http.Response(
          jsonEncode([
            {'id': '1', 'type': 'DOMISILI', 'status': 'SIGNED', 'createdAt': '2026-07-01T00:00:00.000Z', 'letterNumber': '1/SKD/2026', 'qrToken': 't'},
            {'id': '2', 'type': 'SKTM', 'status': 'SUBMITTED', 'createdAt': '2026-07-02T00:00:00.000Z', 'letterNumber': null, 'qrToken': null},
          ]),
          200,
        );
      }
      return http.Response('not found', 404);
    });

    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(generateKeyPair().privateKey));
    session.token = 'x';
    session.api.authToken = 'x';

    await tester.pumpWidget(SessionScope(
      session: session,
      child: const MaterialApp(home: SuratSayaScreen()),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Surat Keterangan Domisili'), findsOneWidget);
    expect(find.text('Surat Keterangan Tidak Mampu'), findsOneWidget);
    expect(find.text('Selesai'), findsOneWidget);
    expect(find.text('Diajukan'), findsOneWidget);
  });
}
