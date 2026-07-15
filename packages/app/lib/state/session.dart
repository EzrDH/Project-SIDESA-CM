import '../api/api_client.dart';
import '../auth/auth_service.dart';
import '../crypto/ecdsa.dart';
import '../crypto/keystore.dart';
import '../app_config.dart';

/// Single source of truth for the signed-in warga: device key, API client,
/// auth, and the session token. Screens go through this.
class Session {
  final ApiClient api;
  final KeyStore keyStore;
  late final AuthService _auth;

  String? token;
  String? accountId;

  Session({ApiClient? api, KeyStore? keyStore})
      : api = api ?? ApiClient(AppConfig.baseUrl),
        keyStore = keyStore ?? InMemoryKeyStore(generateKeyPair().privateKey) {
    _auth = AuthService(this.api, this.keyStore);
  }

  bool get isLoggedIn => token != null;

  /// Key-possession login: fetch a challenge, sign it, exchange for a JWT.
  Future<void> login(String accountId) async {
    token = await _auth.login(accountId);
    this.accountId = accountId;
  }

  void logout() {
    token = null;
    accountId = null;
  }
}
