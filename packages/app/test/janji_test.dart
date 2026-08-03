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

  test('buatJanji attaches an eligibility proof bound to a fresh nonce', () async {
    // Booking is the gate the product exists for: the request must carry a
    // Schnorr proof over a single-use nonce, and never a NIK.
    final calls = <String>[];
    Map<String, dynamic>? posted;

    final mock = MockClient((req) async {
      calls.add('${req.method} ${req.url.path}');
      if (req.url.path.endsWith('/bookings/eligibility-challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-abc'}), 201);
      }
      if (req.url.path.endsWith('/registry/proof')) {
        return http.Response(
          jsonEncode({
            'attributes': 'rt=001;domisili=CibeteungMuara',
            'merkleProof': [
              {'sibling': 'ab' * 48, 'isRight': true},
            ],
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/bookings')) {
        posted = jsonDecode(req.body) as Map<String, dynamic>;
        return http.Response(jsonEncode({'id': 'bk-1', 'checkinToken': 't'}), 201);
      }
      return http.Response('not found', 404);
    });

    final kp = generateKeyPair();
    final session = Session(api: ApiClient('http://test', client: mock), keyStore: InMemoryKeyStore(kp.privateKey));
    session.token = 'x';
    session.api.authToken = 'x';
    session.accountId = 'acc-budi';

    final id = await session.buatJanji('Konsultasi lahan', '2026-09-01T09:00:00.000Z');
    expect(id, 'bk-1');

    // The nonce is fetched before the booking is sent.
    expect(calls.indexWhere((c) => c.contains('eligibility-challenge')),
        lessThan(calls.indexWhere((c) => c.endsWith('/bookings'))));

    final el = posted!['eligibility'] as Map<String, dynamic>;
    expect(el['nonce'], 'nonce-abc');

    final proof = el['proof'] as Map<String, dynamic>;
    expect(proof['publicKey'], bytesToHex(publicKeyFromPrivate(kp.privateKey)));
    expect((proof['ownership'] as String).length, 194); // 97-byte Schnorr proof
    expect(proof['attributes'], 'rt=001;domisili=CibeteungMuara');
    expect(proof['merkleProof'], isA<List<dynamic>>());

    // Data minimisation: nothing resembling a NIK crosses the wire.
    expect(jsonEncode(posted), isNot(matches(RegExp(r'\b\d{16}\b'))));
    expect(jsonEncode(posted).toLowerCase(), isNot(contains('nik')));
  });

  test('buatJanji surfaces a hardware-backed key as UnsupportedError, not a network error', () async {
    // The eligibility proof needs the private scalar; StrongBox never releases
    // it. The screen has to tell the resident that, rather than "coba lagi".
    var bookingAttempted = false;
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/bookings/eligibility-challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-abc'}), 201);
      }
      if (req.url.path.endsWith('/registry/proof')) {
        return http.Response(jsonEncode({'attributes': 'rt=001', 'merkleProof': const []}), 200);
      }
      if (req.url.path.endsWith('/bookings')) {
        bookingAttempted = true;
        return http.Response(jsonEncode({'id': 'bk-1'}), 201);
      }
      return http.Response('not found', 404);
    });

    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: _HardwareOnlyKeyStore(generateKeyPair().privateKey),
    );
    session.token = 'x';
    session.api.authToken = 'x';
    session.accountId = 'acc-budi';

    await expectLater(
      session.buatJanji('Konsultasi', '2026-09-01T09:00:00.000Z'),
      throwsA(isA<UnsupportedError>()),
    );
    expect(bookingAttempted, isFalse, reason: 'no proof can be built, so nothing should be booked');
  });
}

/// Mimics AndroidKeyStore: public key and signing work, but the private scalar
/// never leaves the secure element, so prove() cannot work.
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
