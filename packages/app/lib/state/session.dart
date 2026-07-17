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
  String? role;

  Session({ApiClient? api, KeyStore? keyStore})
      : api = api ?? ApiClient(AppConfig.baseUrl),
        keyStore = keyStore ??
            InMemoryKeyStore(AppConfig.devPrivKey.isNotEmpty
                ? hexToBytes(AppConfig.devPrivKey)
                : generateKeyPair().privateKey) {
    _auth = AuthService(this.api, this.keyStore);
  }

  bool get isLoggedIn => token != null;

  /// Key-possession login: fetch a challenge, sign it, exchange for a JWT.
  Future<void> login(String accountId) async {
    final res = await _auth.login(accountId);
    token = res.token;
    role = res.role;
    api.authToken = token;
    this.accountId = accountId;
  }

  bool get isOperator => role == 'OPERATOR';

  void logout() {
    token = null;
    accountId = null;
    role = null;
    api.authToken = null;
  }

  // --- Authenticated calls ---

  /// Submit a letter request; returns the request id.
  Future<String> ajukanSurat(String type, Map<String, String> formData) async {
    final res = await api.postJson('/letters/request', {'type': type, 'formData': formData});
    return res['id'] as String;
  }

  Future<List<dynamic>> suratSaya() async => (await api.getJson('/letters/mine')) as List<dynamic>;

  /// Book an appointment; returns the booking id.
  Future<String> buatJanji(String purpose, String requestedSlotIso) async {
    final res = await api.postJson('/bookings', {'purpose': purpose, 'requestedSlot': requestedSlotIso});
    return res['id'] as String;
  }

  Future<List<dynamic>> janjiSaya() async => (await api.getJson('/bookings/mine')) as List<dynamic>;

  // --- Operator calls ---

  /// Pending letter requests awaiting operator verification.
  Future<List<dynamic>> antrianSurat() async => (await api.getJson('/letters/queue')) as List<dynamic>;

  /// Verify a request: draft it (assigns a letter number, ready for the Kepala Desa).
  Future<Map<String, dynamic>> verifikasiSurat(String requestId) async =>
      api.postJson('/letters/$requestId/draft', const {});

  /// Reject a request.
  Future<void> tolakSurat(String requestId) async => api.postJson('/letters/$requestId/reject', const {});
}
