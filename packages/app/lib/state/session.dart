import 'dart:convert';
import 'dart:typed_data';
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
  bool get isKades => role == 'KADES';

  void logout() {
    token = null;
    accountId = null;
    role = null;
    api.authToken = null;
  }

  // --- Authenticated calls ---

  /// Submit a letter request, gated by a zero-knowledge eligibility proof.
  ///
  /// Flow: fetch a single-use nonce, fetch this account's Merkle membership
  /// proof, then prove — in zero knowledge — ownership of the registered
  /// pseudonymous key bound to (account, type, nonce). The raw NIK is never
  /// sent; the server verifies membership + ownership and burns the nonce.
  Future<String> ajukanSurat(String type, Map<String, String> formData) async {
    final nonce = (await api.postJson('/letters/eligibility-challenge', const {}))['nonce'] as String;
    final rp = (await api.getJson('/registry/proof')) as Map<String, dynamic>;
    final pub = await keyStore.publicKey();
    final context = utf8.encode('SIDESA-letter-eligibility-v1|$accountId|$type|$nonce');
    final sp = await keyStore.proveKnowledge(Uint8List.fromList(context));
    final eligibility = {
      'proof': {
        'publicKey': bytesToHex(pub),
        'attributes': rp['attributes'],
        'merkleProof': rp['merkleProof'],
        'ownership': {'R': bytesToHex(sp.R), 's': bytesToHex(sp.s)},
      },
      'nonce': nonce,
    };
    final res = await api.postJson('/letters/request', {'type': type, 'formData': formData, 'eligibility': eligibility});
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

  // --- Kepala Desa (signing) calls ---

  /// Drafted letters awaiting the Kepala Desa's signature.
  Future<List<dynamic>> antrianTtd() async => (await api.getJson('/letters/signing-queue')) as List<dynamic>;

  /// Fetch the canonical content + document hash to be signed.
  Future<Map<String, dynamic>> ambilUntukTtd(String requestId) async =>
      (await api.getJson('/letters/$requestId/for-signing')) as Map<String, dynamic>;

  /// Sign the canonical letter on-device (ECDSA P-384; the private key never
  /// leaves the device) and submit the signature. Returns {letterNumber, qrToken}.
  Future<Map<String, dynamic>> tandatanganiSurat(String requestId, String canonicalContent) async {
    final message = Uint8List.fromList(utf8.encode(canonicalContent));
    final signature = bytesToHex(await keyStore.sign(message));
    return api.postJson('/letters/$requestId/sign', {'signature': signature});
  }
}
