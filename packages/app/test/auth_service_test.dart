import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/auth/auth_service.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';

void main() {
  test('login runs challenge -> sign -> verify and returns token + role', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);

    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/auth/challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-xyz'}), 200,
            headers: {'content-type': 'application/json'});
      }
      if (req.url.path.endsWith('/auth/verify')) {
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        final ok = verifyMessage(
          await ks.publicKey(),
          Uint8List.fromList(utf8.encode('SIDESA-auth-v1|${body['accountId']}|${body['nonce']}')),
          hexToBytes(body['signature'] as String),
        );
        return http.Response(jsonEncode({'token': ok ? 'jwt-token' : null, 'role': 'WARGA'}),
            ok ? 201 : 401, headers: {'content-type': 'application/json'});
      }
      return http.Response('not found', 404);
    });

    final api = ApiClient('http://test', client: mock);
    final auth = AuthService(api, ks);
    final res = await auth.login('acc-1');
    expect(res.token, 'jwt-token');
    expect(res.role, 'WARGA');
  });
}
