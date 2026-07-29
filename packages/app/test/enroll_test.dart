import 'dart:convert';
import 'dart:typed_data';
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

    // The code is normalised, and the proof-of-possession really is a Schnorr
    // proof bound to the submitted public key — that is what stops someone
    // enrolling a key they do not control.
    expect(posted!['code'], 'ABCDEFGH');
    final pubHex = posted!['publicKey'] as String;
    expect(pubHex, bytesToHex(publicKeyFromPrivate(kp.privateKey)));
    final proofHex = posted!['proof'] as String;
    expect(proofHex.length, 194);
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

  testWidgets('a hardware-backed key is not blamed on the operator\'s code', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // A StrongBox/Keystore key never releases the private scalar, so prove()
    // throws UnsupportedError. Reporting that as a bad code would send the
    // resident back to the desk for a replacement that cannot be claimed either.
    var requested = false;
    final mock = MockClient((req) async {
      requested = true;
      return http.Response('unreachable', 500);
    });
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: _HardwareOnlyKeyStore(generateKeyPair().privateKey),
    );

    var called = false;
    await tester.pumpWidget(SessionScope(
      session: session,
      child: MaterialApp(home: EnrollScreen(onEnrolled: (_) => called = true)),
    ));

    await tester.enterText(find.byType(TextField), 'ABCD-EFGH');
    await tester.tap(find.text('Daftarkan perangkat'));
    await tester.pumpAndSettle();

    expect(called, isFalse);
    expect(requested, isFalse, reason: 'no proof can be built, so nothing should be sent');
    expect(find.textContaining('belum didukung'), findsOneWidget);
    expect(find.textContaining('tidak valid'), findsNothing);
  });
}

/// Mimics AndroidKeyStore: it can hand out the public key and sign, but the
/// private scalar never leaves the secure element, so prove() cannot work.
class _HardwareOnlyKeyStore implements KeyStore {
  final Uint8List _privateKey;
  _HardwareOnlyKeyStore(this._privateKey);

  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);

  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);

  @override
  Future<Uint8List> prove(Uint8List context) async =>
      throw UnsupportedError('hardware-backed key cannot produce a Schnorr proof');
}
