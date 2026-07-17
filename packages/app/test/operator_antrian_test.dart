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
import 'package:sidesa_app/screens/operator_antrian_screen.dart';

void main() {
  testWidgets('Operator queue lists pending requests and verifies one', (tester) async {
    var draftCalledFor = <String>[];
    var queueCalls = 0;
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/letters/queue')) {
        queueCalls++;
        // First load: one pending request. After verifying, the queue is empty.
        final body = queueCalls == 1
            ? [
                {'id': 'r1', 'type': 'DOMISILI', 'createdAt': '2026-07-17T00:00:00.000Z'},
              ]
            : [];
        return http.Response(jsonEncode(body), 200);
      }
      if (req.url.path.endsWith('/letters/r1/draft')) {
        draftCalledFor.add('r1');
        return http.Response(jsonEncode({'letterNumber': '1/SKD/2026', 'documentHash': 'ab', 'canonicalContent': '...'}), 201);
      }
      return http.Response('not found', 404);
    });

    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(generateKeyPair().privateKey));
    session.token = 'x';
    session.role = 'OPERATOR';
    session.api.authToken = 'x';

    await tester.pumpWidget(SessionScope(
      session: session,
      child: const MaterialApp(home: Scaffold(body: OperatorAntrianScreen())),
    ));
    await tester.pumpAndSettle();

    // The pending request is shown with a human title.
    expect(find.text('Surat Keterangan Domisili'), findsOneWidget);

    // Verifying it calls the draft endpoint and refreshes the (now empty) queue.
    await tester.tap(find.text('Verifikasi'));
    await tester.pumpAndSettle();

    expect(draftCalledFor, contains('r1'));
    expect(find.text('Surat Keterangan Domisili'), findsNothing);
    expect(find.textContaining('Antrean kosong'), findsOneWidget);
  });
}
