import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../auth/auth_service.dart';
import '../crypto/ecdsa.dart';
import '../crypto/keystore.dart';
import '../app_config.dart';
import '../push/push_messaging_adapter.dart';
import 'device_identity.dart';

/// Single source of truth for the signed-in warga: device key, API client,
/// auth, and the session token. Screens go through this.
class Session {
  final ApiClient api;
  final KeyStore keyStore;
  final PushMessagingAdapter push;
  late final AuthService _auth;

  String? token;
  String? accountId;
  String? role;
  String? _pushToken;

  /// Fire-and-forget push (un)registration work; tests await this to observe
  /// the logout unregister call without racing it.
  Future<void> pendingPushWork = Future.value();

  Session({ApiClient? api, KeyStore? keyStore, PushMessagingAdapter? push})
      : api = api ?? ApiClient(AppConfig.baseUrl),
        keyStore = keyStore ??
            InMemoryKeyStore(AppConfig.devPrivKey.isNotEmpty
                ? hexToBytes(AppConfig.devPrivKey)
                : generateKeyPair().privateKey),
        push = push ?? NoopPushAdapter() {
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

    // Push registration is best-effort: a failure here (no Firebase, backend
    // hiccup, ...) must never surface as a login failure.
    try {
      final t = await push.obtainToken();
      if (t != null) {
        _pushToken = t;
        push.onTokenRefresh((nt) {
          _pushToken = nt;
          api.postJson('/notifications/token', {'token': nt, 'platform': _platform()}).catchError((_) => <String, dynamic>{});
        });
        await api.postJson('/notifications/token', {'token': t, 'platform': _platform()});
      }
    } catch (err) {
      debugPrint('push token registration failed: $err');
    }
  }

  /// The only push target supported today; iOS arrives with the deferred
  /// Firebase wiring.
  String _platform() => 'android';

  bool get isOperator => role == 'OPERATOR';
  bool get isKades => role == 'KADES';

  /// Claim a one-time enrolment code issued by an operator, binding this
  /// device's key to the identity the operator verified from the resident's KTP.
  /// Proving knowledge of the private scalar behind (code, publicKey) — a
  /// Schnorr zero-knowledge proof, without ever revealing the key itself —
  /// shows we actually control this key, so a stolen code cannot be used to
  /// enrol a key nobody holds and permanently lock out its rightful owner.
  Future<DeviceIdentity> daftarPerangkat(String code) async {
    final normalized = code.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    final pubHex = bytesToHex(await keyStore.publicKey());
    final message = utf8.encode('SIDESA-enroll-v1|$normalized|$pubHex');
    final proof = await keyStore.prove(Uint8List.fromList(message));
    final res = await api.postJson('/enroll/claim', {
      'code': normalized,
      'publicKey': pubHex,
      'proof': bytesToHex(proof),
    });
    return DeviceIdentity(
      accountId: res['accountId'] as String,
      role: (res['role'] as String?) ?? 'WARGA',
      displayName: (res['displayName'] as String?) ?? '',
    );
  }

  void logout() {
    // The unregister DELETE needs the bearer token, so fire it (capturing the
    // Future) before clearing api.authToken and the rest of the session.
    final t = _pushToken;
    if (t != null) {
      pendingPushWork = api.deleteJson('/notifications/token', {'token': t}).catchError((_) => <String, dynamic>{});
      _pushToken = null;
    }
    token = null;
    accountId = null;
    role = null;
    api.authToken = null;
  }

  // --- Authenticated calls ---

  /// Submit a letter request, gated by an eligibility proof.
  ///
  /// Flow: fetch a single-use nonce, fetch this account's Merkle membership
  /// proof, then prove knowledge of the secret behind the (account, type,
  /// nonce) context to prove control of the registered pseudonymous key. The
  /// raw NIK is never sent; the server verifies membership + ownership and
  /// burns the nonce. Ownership is a Schnorr zero-knowledge proof of
  /// knowledge, bound to this single-use context so a captured proof cannot
  /// be replayed.
  Future<String> ajukanSurat(String type, Map<String, String> formData) async {
    final nonce = (await api.postJson('/letters/eligibility-challenge', const {}))['nonce'] as String;
    final rp = (await api.getJson('/registry/proof')) as Map<String, dynamic>;
    final pub = await keyStore.publicKey();
    final context = utf8.encode('SIDESA-letter-eligibility-v1|$accountId|$type|$nonce');
    final ownership = await keyStore.prove(Uint8List.fromList(context));
    final eligibility = {
      'proof': {
        'publicKey': bytesToHex(pub),
        'attributes': rp['attributes'],
        'merkleProof': rp['merkleProof'],
        'ownership': bytesToHex(ownership),
      },
      'nonce': nonce,
    };
    final res = await api.postJson('/letters/request', {'type': type, 'formData': formData, 'eligibility': eligibility});
    return res['id'] as String;
  }

  Future<List<dynamic>> suratSaya() async => (await api.getJson('/letters/mine')) as List<dynamic>;

  /// Public verification of a signed letter by its QR token — returns the
  /// verified canonical content, signer and signing date.
  Future<Map<String, dynamic>> suratTerverifikasi(String qrToken) async =>
      (await api.getJson('/verify/$qrToken')) as Map<String, dynamic>;

  /// Absolute URL a QR should encode so a scanner reaches the public verifier.
  String verifyUrl(String qrToken) => '${api.baseUrl}/verify/$qrToken';

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
