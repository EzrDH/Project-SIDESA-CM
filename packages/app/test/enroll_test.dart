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
import 'package:sidesa_app/state/device_identity.dart';
import 'package:sidesa_app/screens/enroll_screen.dart';

void main() {
  testWidgets('claiming an enrolment code binds the device and yields its identity', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    Map<String, dynamic>? posted;
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/enroll/claim')) {
        posted = jsonDecode(req.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({'accountId': 'acc-siti', 'role': 'WARGA', 'displayName': 'Siti Aminah'}),
          201,
        );
      }
      return http.Response('not found', 404);
    });

    final kp = generateKeyPair();
    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(kp.privateKey));

    DeviceIdentity? enrolled;
    await tester.pumpWidget(SessionScope(
      session: session,
      child: MaterialApp(home: EnrollScreen(onEnrolled: (i) => enrolled = i)),
    ));

    // The operator reads the code out as "ABCD-EFGH"; typing the dash is fine.
    await tester.enterText(find.byType(TextField), 'abcd-efgh');
    await tester.tap(find.text('Daftarkan perangkat'));
    await tester.pumpAndSettle();

    expect(enrolled, isNotNull);
    expect(enrolled!.accountId, 'acc-siti');
    expect(enrolled!.displayName, 'Siti Aminah');

    // The code is normalised, and the proof-of-possession really verifies
    // against the submitted public key — that is what stops someone enrolling
    // a key they do not control.
    expect(posted!['code'], 'ABCDEFGH');
    final pubHex = posted!['publicKey'] as String;
    expect(pubHex, bytesToHex(publicKeyFromPrivate(kp.privateKey)));
    final message = utf8.encode('SIDESA-enroll-v1|ABCDEFGH|$pubHex');
    expect(
      verifyMessage(hexToBytes(pubHex), message, hexToBytes(posted!['signature'] as String)),
      isTrue,
    );
  });

  testWidgets('a rejected code shows an error and stays on the enrolment screen', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final mock = MockClient((req) async => http.Response(
          jsonEncode({'message': 'Kode enrolmen tidak valid atau kedaluwarsa.'}),
          400,
        ));
    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(generateKeyPair().privateKey));

    var called = false;
    await tester.pumpWidget(SessionScope(
      session: session,
      child: MaterialApp(home: EnrollScreen(onEnrolled: (_) => called = true)),
    ));

    await tester.enterText(find.byType(TextField), 'ZZZZ-ZZZZ');
    await tester.tap(find.text('Daftarkan perangkat'));
    await tester.pumpAndSettle();

    expect(called, isFalse);
    expect(find.textContaining('tidak valid'), findsOneWidget);
    expect(find.text('Daftarkan perangkat'), findsOneWidget);
  });
}
