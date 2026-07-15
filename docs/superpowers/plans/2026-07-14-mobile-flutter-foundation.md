# Mobile App Foundation (Flutter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Flutter foundation that lets a device authenticate to and sign for the SIDESA-CM backend: a Material 3 theme from `DESIGN.md`, a Dart ECDSA P-384 module whose signatures the backend's `@sidesa/crypto` accepts, an API client, and the key-possession auth flow — all verifiable with `flutter test` plus a cross-language interop check.

**Architecture:** The Dart crypto module (pointycastle) mirrors `@sidesa/crypto`'s wire format exactly: compressed P-384 public keys, 96-byte compact **low-S** signatures over the **SHA-384** digest. A device signs the server's auth challenge; the backend verifies with `verifyMessage`. Interop is proven by a Dart test that emits a signed vector which a Vitest test in `@sidesa/crypto` verifies. On-device concerns (Android Keystore key storage, biometric unlock, real emulator e2e) are wired behind a `KeyStore` interface and deferred to device work — they can't run under `flutter test`.

**Tech Stack:** Flutter (Dart 3), Material 3, `pointycastle`, `http`; `flutter_test`; reuses `@sidesa/crypto` for the interop check.

## Global Constraints

- Crypto wire format must match `@sidesa/crypto` **exactly**: ECDSA **P-384**, **SHA-384** prehash, compressed pubkey (49 bytes), compact **low-S** signature (96 bytes). Never P-256/SHA-256.
- The device private key is held behind a `KeyStore` abstraction; the production impl is Android Keystore (device-only). Tests use an in-memory impl.
- Auth message is `SIDESA-auth-v1|<accountId>|<nonce>` (UTF-8) — identical bytes to the backend's `buildAuthMessage`.
- Theme colors come from `DESIGN.md` §4 (seed `#0F5C6B`).

## Prerequisites

- Flutter SDK installed (`flutter --version`), network available for `flutter pub get`.
- The JS workspace is installed (Plan #2). The interop task runs `flutter test` then `npm -w @sidesa/crypto test`.

## File Structure

```
packages/app/                      # flutter create output
  pubspec.yaml                     # + pointycastle, http
  lib/
    theme.dart                     # Material 3 ColorScheme from DESIGN.md
    main.dart                      # app root
    crypto/ecdsa.dart              # keygen/sign/verify (crypto-compatible)
    crypto/keystore.dart           # KeyStore interface + in-memory impl
    api/api_client.dart            # HTTP wrapper (injectable)
    auth/auth_service.dart         # challenge -> sign -> token
    screens/login_screen.dart
    screens/home_screen.dart
  test/
    theme_test.dart, ecdsa_test.dart, interop_emit_test.dart,
    auth_service_test.dart, login_screen_test.dart
packages/crypto/test/interop.dart.test.ts   # verifies the Dart vector
```

---

### Task 1: Flutter scaffold + Material 3 theme

**Files:**
- Create (via `flutter create`): `packages/app/**`
- Create: `packages/app/lib/theme.dart`
- Replace: `packages/app/lib/main.dart`
- Test: `packages/app/test/theme_test.dart`

**Interfaces:** `sidesaTheme(): ThemeData` (Material 3, seed `#0F5C6B`); `SidesaApp` root widget showing a branded scaffold.

- [ ] **Step 1: Scaffold the project**

Run (from repo root):
```bash
flutter create --project-name sidesa_app --org id.desa.cibeteungmuara --platforms android packages/app
```

- [ ] **Step 2: Add dependencies** — edit `packages/app/pubspec.yaml`, under `dependencies:` add:
```yaml
  pointycastle: ^3.9.1
  http: ^1.2.0
```
Then run: `cd packages/app && flutter pub get`

- [ ] **Step 3: Create `lib/theme.dart`**

```dart
import 'package:flutter/material.dart';

const _seed = Color(0xFF0F5C6B); // Biru Arsip (DESIGN.md §4)

ThemeData sidesaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: _seed,
    primary: _seed,
    secondary: const Color(0xFF4F7A3A), // Hijau Padi
    tertiary: const Color(0xFFB7791F), // Ochre Cap
    brightness: Brightness.light,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFFF4F6F7),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52), // large tap target for elderly users
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    cardTheme: CardTheme(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
  );
}
```

- [ ] **Step 4: Replace `lib/main.dart`**

```dart
import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/home_screen.dart';

void main() => runApp(const SidesaApp());

class SidesaApp extends StatelessWidget {
  const SidesaApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIDESA-CM',
      debugShowCheckedModeBanner: false,
      theme: sidesaTheme(),
      home: const HomeScreen(displayName: 'Warga'),
    );
  }
}
```

(HomeScreen is created in Task 5; for Task 1, temporarily point `home:` at a `Scaffold(appBar: AppBar(title: const Text('Desa Cibeteung Muara')))` so the app builds, then switch to HomeScreen in Task 5.)

- [ ] **Step 5: Write `test/theme_test.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';

void main() {
  test('theme uses Material 3 and the Biru Arsip primary', () {
    final t = sidesaTheme();
    expect(t.useMaterial3, isTrue);
    expect(t.colorScheme.primary, const Color(0xFF0F5C6B));
  });
}
```

- [ ] **Step 6: Run** — `flutter test test/theme_test.dart` → PASS.

- [ ] **Step 7: Commit**
```bash
git add packages/app
git commit -m "feat(app): Flutter scaffold + Material 3 theme (DESIGN.md tokens)"
```

---

### Task 2: Dart ECDSA P-384 crypto module

**Files:**
- Create: `packages/app/lib/crypto/ecdsa.dart`
- Test: `packages/app/test/ecdsa_test.dart`

**Interfaces:**
- `class KeyPair { Uint8List privateKey; Uint8List publicKey; }`
- `KeyPair generateKeyPair()` — publicKey compressed (49 bytes)
- `Uint8List publicKeyFromPrivate(Uint8List priv)`
- `Uint8List signMessage(Uint8List priv, Uint8List message)` — 96-byte compact low-S over SHA-384
- `bool verifyMessage(Uint8List pub, Uint8List message, Uint8List sig)`
- `String bytesToHex(Uint8List)`, `Uint8List hexToBytes(String)`

- [ ] **Step 1: Write `test/ecdsa_test.dart`**

```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';

void main() {
  test('generates a 49-byte compressed public key', () {
    final kp = generateKeyPair();
    expect(kp.publicKey.length, 49);
    expect(publicKeyFromPrivate(kp.privateKey), equals(kp.publicKey));
  });

  test('sign/verify roundtrip and 96-byte signature', () {
    final kp = generateKeyPair();
    final msg = utf8.encode('SIDESA-auth-v1|acc-1|nonce-abc');
    final sig = signMessage(kp.privateKey, msg);
    expect(sig.length, 96);
    expect(verifyMessage(kp.publicKey, msg, sig), isTrue);
  });

  test('rejects a tampered message', () {
    final kp = generateKeyPair();
    final sig = signMessage(kp.privateKey, utf8.encode('a'));
    expect(verifyMessage(kp.publicKey, utf8.encode('b'), sig), isFalse);
  });

  test('produces a low-S signature', () {
    final kp = generateKeyPair();
    final sig = signMessage(kp.privateKey, utf8.encode('x'));
    final s = BigInt.parse(bytesToHex(Uint8List.fromList(sig.sublist(48, 96))), radix: 16);
    // secp384r1 order n; s must be <= n/2
    final n = BigInt.parse('ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973', radix: 16);
    expect(s <= (n >> 1), isTrue);
  });
}
```

- [ ] **Step 2: Run — expect FAIL** (`flutter test test/ecdsa_test.dart`)

- [ ] **Step 3: Implement `lib/crypto/ecdsa.dart`**

```dart
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

class KeyPair {
  final Uint8List privateKey;
  final Uint8List publicKey;
  KeyPair(this.privateKey, this.publicKey);
}

final ECDomainParameters _curve = ECCurve_secp384r1();

SecureRandom _rng() {
  final r = FortunaRandom();
  final s = Random.secure();
  r.seed(KeyParameter(Uint8List.fromList(List<int>.generate(32, (_) => s.nextInt(256)))));
  return r;
}

Uint8List _bigIntTo48(BigInt v) {
  final out = Uint8List(48);
  var x = v;
  for (int i = 47; i >= 0; i--) {
    out[i] = (x & BigInt.from(0xff)).toInt();
    x = x >> 8;
  }
  return out;
}

BigInt _bytesToBigInt(Uint8List b) {
  var r = BigInt.zero;
  for (final byte in b) {
    r = (r << 8) | BigInt.from(byte);
  }
  return r;
}

String bytesToHex(Uint8List b) => b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();

Uint8List hexToBytes(String hex) {
  final out = Uint8List(hex.length ~/ 2);
  for (int i = 0; i < out.length; i++) {
    out[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return out;
}

KeyPair generateKeyPair() {
  final gen = ECKeyGenerator()
    ..init(ParametersWithRandom(ECKeyGeneratorParameters(_curve), _rng()));
  final pair = gen.generateKeyPair();
  final priv = pair.privateKey as ECPrivateKey;
  final pub = pair.publicKey as ECPublicKey;
  return KeyPair(_bigIntTo48(priv.d!), pub.Q!.getEncoded(true));
}

Uint8List publicKeyFromPrivate(Uint8List privateKey) {
  final d = _bytesToBigInt(privateKey);
  final q = _curve.G * d;
  return q!.getEncoded(true);
}

Uint8List signMessage(Uint8List privateKey, Uint8List message) {
  final d = _bytesToBigInt(privateKey);
  final signer = ECDSASigner(SHA384Digest(), HMac(SHA384Digest(), 128));
  signer.init(true, PrivateKeyParameter(ECPrivateKey(d, _curve)));
  final sig = signer.generateSignature(message) as ECSignature;
  final n = _curve.n;
  var s = sig.s;
  if (s.compareTo(n >> 1) > 0) s = n - s; // enforce low-S (noble rejects high-S)
  final out = Uint8List(96);
  out.setRange(0, 48, _bigIntTo48(sig.r));
  out.setRange(48, 96, _bigIntTo48(s));
  return out;
}

bool verifyMessage(Uint8List publicKey, Uint8List message, Uint8List signature) {
  final q = _curve.curve.decodePoint(publicKey);
  final signer = ECDSASigner(SHA384Digest());
  signer.init(false, PublicKeyParameter(ECPublicKey(q, _curve)));
  final r = _bytesToBigInt(Uint8List.fromList(signature.sublist(0, 48)));
  final s = _bytesToBigInt(Uint8List.fromList(signature.sublist(48, 96)));
  return signer.verifySignature(message, ECSignature(r, s));
}
```

- [ ] **Step 4: Run — expect PASS (4 tests)**. If `getEncoded`/`decodePoint`/`ECDSASigner` differ in the installed pointycastle version, adjust to that version's API (trust installed typings over this plan).

- [ ] **Step 5: Commit**
```bash
git add packages/app/lib/crypto/ecdsa.dart packages/app/test/ecdsa_test.dart
git commit -m "feat(app): Dart ECDSA P-384 (compressed key, compact low-S over SHA-384)"
```

---

### Task 3: Cross-language interop (Dart signs → @sidesa/crypto verifies)

**Files:**
- Create: `packages/app/test/interop_emit_test.dart` (emits a signed vector to a file)
- Create: `packages/crypto/test/interop.dart.test.ts` (verifies that vector)

**Interfaces:** the vector file `packages/app/build/interop_vector.json` = `{ publicKey, message, signature }` (all hex).

- [ ] **Step 1: Write the Dart emitter — `packages/app/test/interop_emit_test.dart`**

```dart
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';

void main() {
  test('emits an interop vector for @sidesa/crypto to verify', () {
    final kp = generateKeyPair();
    final message = utf8.encode('SIDESA-auth-v1|acc-XYZ|nonce-123');
    final sig = signMessage(kp.privateKey, Uint8List.fromList(message));
    final vector = {
      'publicKey': bytesToHex(kp.publicKey),
      'message': bytesToHex(Uint8List.fromList(message)),
      'signature': bytesToHex(sig),
    };
    final f = File('build/interop_vector.json');
    f.createSync(recursive: true);
    f.writeAsStringSync(jsonEncode(vector));
    expect(f.existsSync(), isTrue);
  });
}
```

- [ ] **Step 2: Write the TS verifier — `packages/crypto/test/interop.dart.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyMessage } from '../src/index';

const vectorPath = fileURLToPath(new URL('../../app/build/interop_vector.json', import.meta.url));
const hexToBytes = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

describe('Dart -> @sidesa/crypto interop', () => {
  it('verifies a signature produced by the Flutter app', () => {
    expect(existsSync(vectorPath), 'run `flutter test` in packages/app first to emit the vector').toBe(true);
    const v = JSON.parse(readFileSync(vectorPath, 'utf8'));
    expect(verifyMessage(hexToBytes(v.publicKey), hexToBytes(v.message), hexToBytes(v.signature))).toBe(true);
  });
});
```

- [ ] **Step 3: Emit the vector, then verify it**

Run:
```bash
cd packages/app && flutter test test/interop_emit_test.dart
cd .. && npm -w @sidesa/crypto test -- test/interop.dart.test.ts
```
Expected: both PASS — the Flutter-produced signature is accepted by `@sidesa/crypto` (the same code the backend runs). If verify is `false`, debug the Dart encoding (compressed point prefix, low-S, 48-byte padding) with superpowers:systematic-debugging — do NOT relax the verifier.

- [ ] **Step 4: Commit**
```bash
git add packages/app/test/interop_emit_test.dart packages/crypto/test/interop.dart.test.ts
git commit -m "test: prove Flutter ECDSA signatures verify with @sidesa/crypto"
```

---

### Task 4: API client + key-possession auth flow

**Files:**
- Create: `packages/app/lib/crypto/keystore.dart`
- Create: `packages/app/lib/api/api_client.dart`
- Create: `packages/app/lib/auth/auth_service.dart`
- Test: `packages/app/test/auth_service_test.dart`

**Interfaces:**
- `abstract class KeyStore { Future<Uint8List> publicKey(); Future<Uint8List> sign(Uint8List message); }` + `InMemoryKeyStore` (device impl = Android Keystore, later).
- `class ApiClient { Future<Map> postJson(String path, Map body); }` (wraps an injectable `http.Client`).
- `class AuthService { Future<String> login(String accountId); }` → returns a JWT by running challenge → sign → verify.

- [ ] **Step 1: Write `test/auth_service_test.dart`**

```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/auth/auth_service.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';

void main() {
  test('login runs challenge -> sign -> verify and returns a token', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);

    final mock = MockClient((req) async {
      if (req.url.path.endsWith('/auth/challenge')) {
        return http.Response(jsonEncode({'nonce': 'nonce-xyz'}), 200, headers: {'content-type': 'application/json'});
      }
      if (req.url.path.endsWith('/auth/verify')) {
        final body = jsonDecode(req.body);
        // server-side: verify the signature the app sent
        final ok = verifyMessage(
          await ks.publicKey(),
          utf8.encode('SIDESA-auth-v1|${body['accountId']}|${body['nonce']}') as dynamic,
          hexToBytes(body['signature'] as String),
        );
        return http.Response(jsonEncode({'token': ok ? 'jwt-token' : null, 'role': 'WARGA'}), ok ? 201 : 401);
      }
      return http.Response('not found', 404);
    });

    final api = ApiClient('http://test', client: mock);
    final auth = AuthService(api, ks);
    final token = await auth.login('acc-1');
    expect(token, 'jwt-token');
  });
}
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement the three files**

`lib/crypto/keystore.dart`:
```dart
import 'dart:typed_data';
import 'ecdsa.dart';

abstract class KeyStore {
  Future<Uint8List> publicKey();
  Future<Uint8List> sign(Uint8List message);
}

/// Test/dev impl. On device this is backed by Android Keystore (non-exportable key).
class InMemoryKeyStore implements KeyStore {
  final Uint8List _privateKey;
  InMemoryKeyStore(this._privateKey);
  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);
  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);
}
```

`lib/api/api_client.dart`:
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;
  final http.Client _client;
  ApiClient(this.baseUrl, {http.Client? client}) : _client = client ?? http.Client();

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    final res = await _client.post(
      Uri.parse('$baseUrl$path'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode >= 400) {
      throw Exception('Request $path gagal (${res.statusCode}).');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
```

`lib/auth/auth_service.dart`:
```dart
import 'dart:convert';
import 'dart:typed_data';
import '../api/api_client.dart';
import '../crypto/ecdsa.dart';
import '../crypto/keystore.dart';

class AuthService {
  final ApiClient _api;
  final KeyStore _keyStore;
  AuthService(this._api, this._keyStore);

  Future<String> login(String accountId) async {
    final ch = await _api.postJson('/auth/challenge', {'accountId': accountId});
    final nonce = ch['nonce'] as String;
    final message = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|$accountId|$nonce'));
    final signature = bytesToHex(await _keyStore.sign(message));
    final vr = await _api.postJson('/auth/verify', {
      'accountId': accountId,
      'nonce': nonce,
      'signature': signature,
    });
    return vr['token'] as String;
  }
}
```

- [ ] **Step 4: Run — expect PASS (1 test)**

- [ ] **Step 5: Commit**
```bash
git add packages/app/lib/crypto/keystore.dart packages/app/lib/api/api_client.dart packages/app/lib/auth/auth_service.dart packages/app/test/auth_service_test.dart
git commit -m "feat(app): API client + key-possession auth flow (challenge -> sign -> token)"
```

---

### Task 5: Login + Home screens (widget tests)

**Files:**
- Create: `packages/app/lib/screens/login_screen.dart`
- Create: `packages/app/lib/screens/home_screen.dart`
- Modify: `packages/app/lib/main.dart` (point `home:` at `LoginScreen`)
- Test: `packages/app/test/login_screen_test.dart`

**Interfaces:** `LoginScreen({VoidCallback onLogin})`; `HomeScreen({String displayName})` with the three quick actions from DESIGN.md.

- [ ] **Step 1: Write `test/login_screen_test.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';
import 'package:sidesa_app/screens/login_screen.dart';

void main() {
  testWidgets('login screen shows fingerprint and PIN actions', (tester) async {
    var tapped = false;
    await tester.pumpWidget(MaterialApp(
      theme: sidesaTheme(),
      home: LoginScreen(onLogin: () => tapped = true),
    ));
    expect(find.text('Desa Cibeteung Muara'), findsOneWidget);
    expect(find.text('Masuk dengan sidik jari'), findsOneWidget);
    expect(find.text('Gunakan PIN'), findsOneWidget);

    await tester.tap(find.text('Masuk dengan sidik jari'));
    expect(tapped, isTrue);
  });
}
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement the screens**

`lib/screens/login_screen.dart`:
```dart
import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  final VoidCallback onLogin;
  const LoginScreen({super.key, required this.onLogin});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(radius: 36, backgroundColor: cs.primary,
                child: Icon(Icons.account_balance, color: cs.onPrimary, size: 36)),
              const SizedBox(height: 16),
              Text('Desa Cibeteung Muara',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: cs.primary)),
              const Text('Portal Layanan Digital Warga'),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onLogin,
                icon: const Icon(Icons.fingerprint),
                label: const Text('Masuk dengan sidik jari'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: onLogin,
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: const Text('Gunakan PIN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

`lib/screens/home_screen.dart`:
```dart
import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final String displayName;
  const HomeScreen({super.key, required this.displayName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Desa Cibeteung Muara')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Halo, $displayName',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          const Text('Selamat datang di layanan digital desa.'),
          const SizedBox(height: 20),
          for (final a in const [
            ('Ajukan Surat', Icons.note_add),
            ('Buat Janji', Icons.event),
            ('Surat Saya', Icons.folder_open),
          ])
            Card(child: ListTile(leading: Icon(a.$2), title: Text(a.$1))),
        ],
      ),
    );
  }
}
```

Update `lib/main.dart` `home:` to `LoginScreen(onLogin: () {})` (navigation is wired in a later UI plan).

- [ ] **Step 4: Run — expect PASS.** Also run the whole app suite: `flutter test` → all green.

- [ ] **Step 5: Commit**
```bash
git add packages/app/lib/screens packages/app/lib/main.dart packages/app/test/login_screen_test.dart
git commit -m "feat(app): login + home screens (Material 3, DESIGN.md)"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** Material 3 theme from DESIGN.md (Task 1) ✅; Dart ECDSA matching the backend wire format (Task 2) ✅; proven interop with `@sidesa/crypto` (Task 3) ✅; API client + key-possession auth flow (Task 4) ✅; login/home screens (Task 5) ✅.

**Deferred (device-only, not `flutter test`-able):** Android Keystore/StrongBox-backed `KeyStore` impl; biometric unlock; full emulator e2e against the running backend; the remaining screens (surat request/status/cap-digital, operator, kades) — a follow-up UI plan drives these off the same theme + API client + auth.

**Placeholder scan:** none. Notes flag where pointycastle's installed API may differ (trust installed typings).

**Type consistency:** `KeyStore` is consumed by `AuthService`; the auth message string is byte-identical to the backend's `buildAuthMessage`; `bytesToHex`/`hexToBytes` are shared from `ecdsa.dart`.

## Notes for the executor
- Task 3 is the crux. If the Dart signature fails TS verification, the bug is almost always: (a) high-S not normalized, (b) wrong point compression prefix, or (c) missing/extra leading-zero byte in r/s. Fix the Dart side; never weaken the verifier.
- `flutter pub get` and the first `flutter test` need network and may be slow.
