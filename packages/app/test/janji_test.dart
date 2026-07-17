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
import 'package:sidesa_app/screens/janji_screen.dart';

void main() {
  testWidgets('Janji loads the warga bookings from the server', (tester) async {
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/bookings/mine')) {
        return http.Response(
          jsonEncode([
            {'id': '1', 'purpose': 'Konsultasi lahan', 'requestedSlot': '2026-09-01T09:00:00.000Z', 'confirmedSlot': '2026-09-01T09:00:00.000Z', 'status': 'CONFIRMED'},
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
      child: const MaterialApp(home: JanjiScreen()),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Konsultasi lahan'), findsOneWidget);
    expect(find.text('Terjadwal'), findsOneWidget);
  });
}
