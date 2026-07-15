import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/state/session.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';

void main() {
  test('Session.login signs the challenge and stores the token', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);

    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/auth/challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-1'}), 200,
            headers: {'content-type': 'application/json'});
      }
      if (req.url.path.endsWith('/auth/verify')) {
        final body = jsonDecode(req.body);
        final ok = verifyMessage(
          await ks.publicKey(),
          utf8.encode('SIDESA-auth-v1|${body['accountId']}|${body['nonce']}'),
          hexToBytes(body['signature'] as String),
        );
        return http.Response(jsonEncode({'token': ok ? 'jwt-1' : null, 'role': 'WARGA'}), ok ? 201 : 401);
      }
      return http.Response('not found', 404);
    });

    final session = Session(api: ApiClient('http://test', client: mock), keyStore: ks);
    expect(session.isLoggedIn, isFalse);
    await session.login('acc-1');
    expect(session.isLoggedIn, isTrue);
    expect(session.token, 'jwt-1');
    expect(session.accountId, 'acc-1');
  });
}
