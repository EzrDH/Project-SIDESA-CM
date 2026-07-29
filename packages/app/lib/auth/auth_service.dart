import 'dart:convert';
import 'dart:typed_data';
import '../api/api_client.dart';
import '../crypto/ecdsa.dart';
import '../crypto/keystore.dart';

class AuthService {
  final ApiClient _api;
  final KeyStore _keyStore;
  AuthService(this._api, this._keyStore);

  Future<({String token, String role})> login(String accountId) async {
    final ch = await _api.postJson('/auth/challenge', {'accountId': accountId});
    final nonce = ch['nonce'] as String;
    final message = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|$accountId|$nonce'));
    final proof = await _keyStore.prove(message);
    final vr = await _api.postJson('/auth/verify', {
      'accountId': accountId,
      'nonce': nonce,
      'proof': bytesToHex(proof),
    });
    return (token: vr['token'] as String, role: (vr['role'] as String?) ?? 'WARGA');
  }
}
