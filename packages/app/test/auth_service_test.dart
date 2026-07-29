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
  test('login runs challenge -> prove -> verify and returns token + role', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);

    String? postedProof;
    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/auth/challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-xyz'}), 200,
            headers: {'content-type': 'application/json'});
      }
      if (req.url.path.endsWith('/auth/verify')) {
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        postedProof = body['proof'] as String?;
        // The client has no Schnorr verifier of its own (only the server
        // does) so this mock checks the wire shape the real backend
        // enforces: 97 bytes (R || s) encoded as 194 lowercase hex chars.
        final ok = postedProof != null && hexToBytes(postedProof!).length == 97;
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
    expect(postedProof, isNotNull);
    expect(postedProof!.length, 194);
  });
}
