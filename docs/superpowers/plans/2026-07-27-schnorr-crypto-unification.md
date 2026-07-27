# Schnorr Crypto Unification Implementation Plan (Tahap 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ECDSA signature used by the three identity gates — authentication, device enrolment, and eligibility — with a Schnorr non-interactive zero-knowledge proof of knowledge, so the product's identity layer rests on one cryptographic primitive and no ECDSA.

**Architecture:** `packages/crypto/src/schnorr.ts` already implements and tests `proveKnowledge`/`verifyKnowledge` over P-384 with a SHA-384 domain-separated challenge; this plan puts it back into service. A fixed 97-byte wire encoding (`R || s`) is added so both languages agree, a Dart port is written and pinned by a cross-language interop vector, the Flutter `KeyStore` gains a `prove()` operation, and each gate is migrated in turn. The letter subsystem keeps using ECDSA until it is deleted in Tahap 2, so `ecdsa.ts` is not removed here.

**Tech Stack:** TypeScript (`@noble/curves` P-384, `@noble/hashes` SHA-384), NestJS + Prisma + PostgreSQL, Dart/Flutter (`pointycastle` `ECCurve_secp384r1`), Vitest, `flutter test`.

## Global Constraints

- The identity gates must contain **no ECDSA**. `signMessage`/`verifyMessage` may remain in the codebase only for the letter subsystem, which Tahap 2 deletes.
- Curve is **P-384**; hash is **SHA-384**. P-256 and standalone SHA-256 are not permitted anywhere.
- The Schnorr challenge domain is exactly `SIDESA-schnorr-v1`, and `domainHash` prefixes the domain and every part with its 32-bit big-endian length before digesting.
- Wire encoding of a proof is exactly 97 bytes: `R` (49-byte compressed point) followed by `s` (48-byte big-endian scalar); on the wire it is lowercase hex of length 194.
- A verified fact this plan relies on: for the same secret scalar, the ECDSA public key and the Schnorr public key are byte-identical (both are `x·G` compressed, 49 bytes). **Existing `Account.publicKey` rows stay valid — no data migration and no Prisma migration in this plan.**
- Devices whose key lives in Android Keystore cannot produce a Schnorr proof (the hardware never exposes the scalar). `AndroidKeyStore.prove()` therefore throws, and such devices must re-enrol against the software key store. This is the accepted consequence recorded as R-2.
- Never weaken an existing test to make a suite pass. A failing crypto test means investigate, not adjust.
- Commit after every task with a conventional message ending in the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Never commit `.env`.
- PostgreSQL must be running for backend tests: `npm run db:up` (Docker container `sidesa-pg`).

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/crypto/src/schnorr.ts` | Existing prove/verify; gains the wire codec and a secret-from-bytes helper | 1 |
| `packages/crypto/src/index.ts` | Re-exports the new helpers | 1 |
| `packages/app/lib/crypto/schnorr.dart` | Dart port of the prover and the codec | 2 |
| `packages/app/lib/crypto/keystore.dart` | `KeyStore` gains `prove(context)` | 3 |
| `packages/app/lib/crypto/android_keystore.dart` | `prove()` throws — hardware cannot do Schnorr | 3 |
| `packages/backend/src/auth/auth.service.ts` + `auth.dto.ts` | Gate 1 verifies a proof | 4 |
| `packages/app/lib/auth/auth_service.dart` | Gate 1 produces a proof | 4 |
| `packages/backend/src/enroll/enroll.service.ts` + `enroll.dto.ts` | Gate 2 verifies a proof | 5 |
| `packages/app/lib/state/session.dart` | Gates 2 and 3 produce proofs | 5, 6 |
| `packages/crypto/src/eligibility.ts` | Gate 3 ownership sub-proof becomes Schnorr | 6 |
| `packages/backend/test/no-ecdsa-in-gates.test.ts` | Guard that the gates never regress to ECDSA | 7 |

---

### Task 1: Proof wire codec and secret helper in `@sidesa/crypto`

**Files:**
- Modify: `packages/crypto/src/schnorr.ts`
- Modify: `packages/crypto/src/index.ts`
- Test: `packages/crypto/test/schnorr.codec.test.ts`

**Interfaces:**
- Consumes: existing `SchnorrProof { R: Uint8Array; s: Uint8Array }`, `proveKnowledge(secret: bigint, publicKey: Uint8Array, context: Uint8Array): SchnorrProof`, `verifyKnowledge(publicKey: Uint8Array, proof: SchnorrProof, context: Uint8Array): boolean`.
- Produces:
  - `const PROOF_BYTES = 97`
  - `encodeProof(p: SchnorrProof): Uint8Array` — 97 bytes, `R || s`
  - `decodeProof(b: Uint8Array): SchnorrProof` — throws on any length but 97
  - `secretFromBytes(b: Uint8Array): bigint` — big-endian; throws unless `1 <= x < n`

- [ ] **Step 1: Write the failing test**

```ts
// packages/crypto/test/schnorr.codec.test.ts
import { describe, it, expect } from 'vitest';
import {
  PROOF_BYTES, encodeProof, decodeProof, secretFromBytes,
  proveKnowledge, verifyKnowledge, derivePublic, randomScalar,
} from '../src/index';

const enc = new TextEncoder();

describe('Schnorr proof wire codec', () => {
  it('round-trips a proof through 97 bytes', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const ctx = enc.encode('SIDESA-auth-v1|acc-1|nonce-1');
    const p = proveKnowledge(x, X, ctx);

    const bytes = encodeProof(p);
    expect(bytes.length).toBe(PROOF_BYTES);
    expect(PROOF_BYTES).toBe(97);

    const back = decodeProof(bytes);
    expect(verifyKnowledge(X, back, ctx)).toBe(true);
  });

  it('rejects a proof of the wrong length', () => {
    expect(() => decodeProof(new Uint8Array(96))).toThrow();
    expect(() => decodeProof(new Uint8Array(98))).toThrow();
  });

  it('rejects a decoded proof whose bytes were tampered with', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const ctx = enc.encode('SIDESA-auth-v1|acc-1|nonce-1');
    const bytes = encodeProof(proveKnowledge(x, X, ctx));
    bytes[80] ^= 0x01; // flip a bit inside s
    expect(verifyKnowledge(X, decodeProof(bytes), ctx)).toBe(false);
  });

  it('converts a 48-byte secret and rejects zero', () => {
    const x = randomScalar();
    const X = derivePublic(x);
    const asBytes = new Uint8Array(48);
    // big-endian encode x
    let v = x;
    for (let i = 47; i >= 0; i--) { asBytes[i] = Number(v & 0xffn); v >>= 8n; }
    expect(secretFromBytes(asBytes)).toBe(x);
    expect(derivePublic(secretFromBytes(asBytes))).toEqual(X);
    expect(() => secretFromBytes(new Uint8Array(48))).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:crypto -- schnorr.codec`
Expected: FAIL — `PROOF_BYTES`, `encodeProof`, `decodeProof`, `secretFromBytes` are not exported.

- [ ] **Step 3: Implement the codec**

Append to `packages/crypto/src/schnorr.ts`:

```ts
const POINT_BYTES = 49;
export const PROOF_BYTES = POINT_BYTES + SCALAR_BYTES; // 49 + 48 = 97

/** Wire form of a proof: compressed commitment R followed by the scalar s. */
export function encodeProof(p: SchnorrProof): Uint8Array {
  if (p.R.length !== POINT_BYTES || p.s.length !== SCALAR_BYTES) {
    throw new Error('SchnorrProof has an unexpected shape');
  }
  const out = new Uint8Array(PROOF_BYTES);
  out.set(p.R, 0);
  out.set(p.s, POINT_BYTES);
  return out;
}

export function decodeProof(bytes: Uint8Array): SchnorrProof {
  if (bytes.length !== PROOF_BYTES) {
    throw new Error(`Schnorr proof must be ${PROOF_BYTES} bytes, got ${bytes.length}`);
  }
  return { R: bytes.slice(0, POINT_BYTES), s: bytes.slice(POINT_BYTES) };
}

/**
 * Read a stored private key (48-byte big-endian) as a Schnorr secret. The same
 * scalar yields the same public key as ECDSA does, so enrolled keys keep working.
 */
export function secretFromBytes(bytes: Uint8Array): bigint {
  const x = bytesToNumberBE(bytes);
  if (x <= 0n || x >= N) throw new Error('secret out of range');
  return x;
}
```

- [ ] **Step 4: Export from the package index**

In `packages/crypto/src/index.ts`, replace the schnorr export line with:

```ts
export {
  randomScalar, derivePublic, proveKnowledge, verifyKnowledge,
  encodeProof, decodeProof, secretFromBytes, PROOF_BYTES,
} from './schnorr';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:crypto -- schnorr.codec`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/crypto/src/schnorr.ts packages/crypto/src/index.ts packages/crypto/test/schnorr.codec.test.ts
git commit -m "feat(crypto): Schnorr proof wire codec and secret helper"
```

---

### Task 2: Dart Schnorr prover and cross-language interop vector

**Files:**
- Create: `packages/app/lib/crypto/schnorr.dart`
- Test: `packages/app/test/schnorr_test.dart`
- Test: `packages/crypto/test/interop.schnorr.test.ts`

**Interfaces:**
- Consumes: the wire format from Task 1 (97 bytes, `R || s`), challenge domain `SIDESA-schnorr-v1`.
- Produces (Dart):
  - `Uint8List schnorrDomainHash(String domain, List<Uint8List> parts)`
  - `Uint8List proveKnowledgeEncoded(Uint8List privateKey, Uint8List publicKey, Uint8List context)` — returns the 97-byte encoded proof
  - `Uint8List derivePublicFromPrivate(Uint8List privateKey)` — 49-byte compressed point

- [ ] **Step 1: Write the failing Dart test**

```dart
// packages/app/test/schnorr_test.dart
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart' show generateKeyPair, bytesToHex;
import 'package:sidesa_app/crypto/schnorr.dart';

void main() {
  test('produces a 97-byte proof whose public key matches the ECDSA one', () {
    final kp = generateKeyPair();
    final ctx = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-1|nonce-1'));
    final proof = proveKnowledgeEncoded(kp.privateKey, kp.publicKey, ctx);

    expect(proof.length, 97);
    // The Schnorr public key derivation must agree with the ECDSA one.
    expect(bytesToHex(derivePublicFromPrivate(kp.privateKey)), bytesToHex(kp.publicKey));
  });

  test('two proofs over the same context differ (fresh nonce k)', () {
    final kp = generateKeyPair();
    final ctx = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-1|nonce-1'));
    final a = proveKnowledgeEncoded(kp.privateKey, kp.publicKey, ctx);
    final b = proveKnowledgeEncoded(kp.privateKey, kp.publicKey, ctx);
    expect(bytesToHex(a), isNot(bytesToHex(b)));
  });

  test('emits a Schnorr interop vector for @sidesa/crypto to verify', () {
    final kp = generateKeyPair();
    final ctx = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-XYZ|nonce-123'));
    final proof = proveKnowledgeEncoded(kp.privateKey, kp.publicKey, ctx);
    final f = File('build/interop_schnorr_vector.json');
    f.createSync(recursive: true);
    f.writeAsStringSync(jsonEncode({
      'publicKey': bytesToHex(kp.publicKey),
      'context': bytesToHex(ctx),
      'proof': bytesToHex(proof),
    }));
    expect(f.existsSync(), isTrue);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/app && flutter test test/schnorr_test.dart`
Expected: FAIL — `schnorr.dart` does not exist.

- [ ] **Step 3: Implement the Dart prover**

```dart
// packages/app/lib/crypto/schnorr.dart
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

final ECDomainParameters _curve = ECCurve_secp384r1();
final BigInt _n = _curve.n;
const int _scalarBytes = 48;

SecureRandom _rng() {
  final r = FortunaRandom();
  final s = Random.secure();
  r.seed(KeyParameter(Uint8List.fromList(List<int>.generate(32, (_) => s.nextInt(256)))));
  return r;
}

BigInt _fromBytes(Uint8List b) {
  var v = BigInt.zero;
  for (final byte in b) {
    v = (v << 8) | BigInt.from(byte);
  }
  return v;
}

Uint8List _toBytes(BigInt v, int len) {
  final out = Uint8List(len);
  var x = v;
  for (var i = len - 1; i >= 0; i--) {
    out[i] = (x & BigInt.from(0xff)).toInt();
    x = x >> 8;
  }
  return out;
}

Uint8List _lenPrefixed(Uint8List b) {
  final out = BytesBuilder();
  final len = ByteData(4)..setUint32(0, b.length, Endian.big);
  out.add(len.buffer.asUint8List());
  out.add(b);
  return out.toBytes();
}

/// Mirrors domainHash in @sidesa/crypto: every part is length-prefixed with a
/// 32-bit big-endian length before being digested, so concatenation is unambiguous.
Uint8List schnorrDomainHash(String domain, List<Uint8List> parts) {
  final bb = BytesBuilder();
  bb.add(_lenPrefixed(Uint8List.fromList(utf8.encode(domain))));
  for (final p in parts) {
    bb.add(_lenPrefixed(p));
  }
  return SHA384Digest().process(bb.toBytes());
}

BigInt _challenge(Uint8List publicKey, Uint8List r, Uint8List context) {
  final h = schnorrDomainHash('SIDESA-schnorr-v1', [publicKey, r, context]);
  return _fromBytes(h) % _n;
}

Uint8List derivePublicFromPrivate(Uint8List privateKey) {
  final x = _fromBytes(privateKey);
  return Uint8List.fromList((_curve.G * x)!.getEncoded(true));
}

BigInt _randomScalar() {
  final rng = _rng();
  for (;;) {
    // 64 random bytes reduced mod n removes modulo bias.
    final v = _fromBytes(rng.nextBytes(64)) % _n;
    if (v != BigInt.zero) return v;
  }
}

/// Non-interactive Schnorr proof of knowledge of the scalar behind [publicKey],
/// bound to [context]. Returns the 97-byte wire form: R (49) || s (48).
Uint8List proveKnowledgeEncoded(Uint8List privateKey, Uint8List publicKey, Uint8List context) {
  final x = _fromBytes(privateKey);
  for (;;) {
    final k = _randomScalar();
    final r = Uint8List.fromList((_curve.G * k)!.getEncoded(true));
    final e = _challenge(publicKey, r, context);
    if (e == BigInt.zero) continue;
    final s = (k + e * x) % _n;
    if (s == BigInt.zero) continue;
    final out = BytesBuilder();
    out.add(r);
    out.add(_toBytes(s, _scalarBytes));
    return out.toBytes();
  }
}
```

- [ ] **Step 4: Run the Dart test to verify it passes**

Run: `cd packages/app && flutter test test/schnorr_test.dart`
Expected: PASS (3 tests), and `packages/app/build/interop_schnorr_vector.json` now exists.

- [ ] **Step 5: Write the TypeScript side of the interop check**

```ts
// packages/crypto/test/interop.schnorr.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verifyKnowledge, decodeProof } from '../src/index';

const vectorPath = fileURLToPath(
  new URL('../../app/build/interop_schnorr_vector.json', import.meta.url),
);
const hexToBytes = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((x) => parseInt(x, 16)));

// Emitted by `flutter test` in packages/app (gitignored build/ dir). Skipped
// gracefully when absent so this package's suite stays green on its own.
describe('Dart -> @sidesa/crypto Schnorr interop', () => {
  it.skipIf(!existsSync(vectorPath))('verifies a proof produced by the Flutter app', () => {
    const v = JSON.parse(readFileSync(vectorPath, 'utf8'));
    const ok = verifyKnowledge(
      hexToBytes(v.publicKey),
      decodeProof(hexToBytes(v.proof)),
      hexToBytes(v.context),
    );
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 6: Run the interop test to verify it passes**

Run: `npm run test:crypto -- interop.schnorr`
Expected: PASS (not skipped, because Step 4 produced the vector). If it reports SKIPPED, re-run Step 4 first — a skipped interop test proves nothing.

- [ ] **Step 7: Commit**

```bash
git add packages/app/lib/crypto/schnorr.dart packages/app/test/schnorr_test.dart packages/crypto/test/interop.schnorr.test.ts
git commit -m "feat(app): Dart Schnorr prover with cross-language interop vector"
```

---

### Task 3: `KeyStore.prove()` on the Flutter side

**Files:**
- Modify: `packages/app/lib/crypto/keystore.dart`
- Modify: `packages/app/lib/crypto/android_keystore.dart`
- Test: `packages/app/test/keystore_prove_test.dart`

**Interfaces:**
- Consumes: `proveKnowledgeEncoded(privateKey, publicKey, context)` from Task 2.
- Produces: `KeyStore.prove(Uint8List context) -> Future<Uint8List>` (97-byte encoded proof), implemented by `InMemoryKeyStore`; `AndroidKeyStore.prove` throws `UnsupportedError`.

- [ ] **Step 1: Write the failing test**

```dart
// packages/app/test/keystore_prove_test.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart' show generateKeyPair;
import 'package:sidesa_app/crypto/keystore.dart';

void main() {
  test('InMemoryKeyStore produces a 97-byte Schnorr proof bound to the context', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);
    final proof = await ks.prove(Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-1|n-1')));
    expect(proof.length, 97);
  });

  test('the key store public key is the one the proof is about', () async {
    final kp = generateKeyPair();
    final ks = InMemoryKeyStore(kp.privateKey);
    expect(await ks.publicKey(), kp.publicKey);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/app && flutter test test/keystore_prove_test.dart`
Expected: FAIL — `prove` is not defined on `KeyStore`.

- [ ] **Step 3: Add `prove` to the abstraction and the in-memory store**

Replace `packages/app/lib/crypto/keystore.dart` with:

```dart
import 'dart:typed_data';
import 'ecdsa.dart';
import 'schnorr.dart';

abstract class KeyStore {
  Future<Uint8List> publicKey();

  /// ECDSA signature. Still used by the letter subsystem, which Tahap 2 removes.
  Future<Uint8List> sign(Uint8List message);

  /// Schnorr proof of knowledge bound to [context], 97 bytes (R || s).
  /// This is what the identity gates use.
  Future<Uint8List> prove(Uint8List context);
}

/// Test/dev impl holding the scalar in memory. Schnorr needs the scalar itself,
/// which hardware-backed stores never expose — see AndroidKeyStore.prove.
class InMemoryKeyStore implements KeyStore {
  final Uint8List _privateKey;
  InMemoryKeyStore(this._privateKey);

  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);

  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);

  @override
  Future<Uint8List> prove(Uint8List context) async =>
      proveKnowledgeEncoded(_privateKey, publicKeyFromPrivate(_privateKey), context);
}
```

- [ ] **Step 4: Make the hardware store fail loudly**

Add this override to the `AndroidKeyStore` class in `packages/app/lib/crypto/android_keystore.dart`:

```dart
  @override
  Future<Uint8List> prove(Uint8List context) async {
    // Schnorr computes s = k + e*x and therefore needs the private scalar.
    // Android Keystore never releases it — only signing is exposed. Devices
    // enrolled against hardware keys must re-enrol with the software store.
    throw UnsupportedError(
      'Kunci berbasis perangkat keras tidak dapat membuat bukti Schnorr; daftarkan ulang perangkat.',
    );
  }
```

- [ ] **Step 5: Run the focused test, then the whole app suite**

Run: `cd packages/app && flutter test test/keystore_prove_test.dart`
Expected: PASS (2 tests).
Run: `cd packages/app && flutter test`
Expected: all previously passing tests still pass (26 before this plan, now 31 with Tasks 2 and 3).

- [ ] **Step 6: Commit**

```bash
git add packages/app/lib/crypto/keystore.dart packages/app/lib/crypto/android_keystore.dart packages/app/test/keystore_prove_test.dart
git commit -m "feat(app): KeyStore.prove for Schnorr, unsupported on hardware keys"
```

---

### Task 4: Migrate Gate 1 — authentication

**Files:**
- Modify: `packages/backend/src/auth/auth.service.ts`
- Modify: `packages/backend/src/auth/auth.dto.ts`
- Modify: `packages/backend/src/auth/auth.controller.ts` (field rename only)
- Modify: `packages/app/lib/auth/auth_service.dart`
- Test: `packages/backend/test/auth.service.test.ts` (update existing)
- Test: `packages/backend/test/auth-flow.e2e.test.ts` (update existing)

**Interfaces:**
- Consumes: `verifyKnowledge`, `decodeProof`, `proveKnowledge`, `secretFromBytes`, `derivePublic` from `@sidesa/crypto`; `KeyStore.prove` from Task 3.
- Produces: `POST /auth/verify` body becomes `{ accountId, nonce, proof }` where `proof` is 194 lowercase hex characters. The message the proof is bound to is unchanged: `buildAuthMessage(accountId, nonce)`.

- [ ] **Step 1: Read the current shape before editing**

Read `packages/backend/src/auth/auth.service.ts`, `auth.dto.ts` and `auth.controller.ts`. The service method today takes `signatureHex` and calls `verifyMessage(hexToBytes(account.publicKey), buildAuthMessage(accountId, nonce), hexToBytes(signatureHex))`. Everything else about the challenge lifecycle (single use, 5-minute expiry, account must be `ACTIVE`) stays exactly as it is.

- [ ] **Step 2: Update the failing tests first**

In `packages/backend/test/auth.service.test.ts`, replace ECDSA proof construction with Schnorr. Where the test previously built a signature with `signMessage(kp.privateKey, buildAuthMessage(id, nonce))`, build instead:

```ts
import {
  generateKeyPair, derivePublic, secretFromBytes, proveKnowledge, encodeProof,
} from '@sidesa/crypto';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function schnorrProofHex(privateKey: Uint8Array, context: Uint8Array): string {
  const x = secretFromBytes(privateKey);
  return hex(encodeProof(proveKnowledge(x, derivePublic(x), context)));
}
```

and call the service with that hex string. Keep every existing assertion — including the negative ones (wrong key rejected, reused challenge rejected, non-ACTIVE account rejected). Add one new negative test:

```ts
it('rejects a proof built for a different nonce', async () => {
  // build the proof over nonce A, submit it against nonce B
  const good = buildAuthMessage(accountId, nonceA);
  const proof = schnorrProofHex(kp.privateKey, good);
  const res = await service.verify(accountId, nonceB, proof);
  expect(res.ok).toBe(false);
});
```

Apply the same substitution in `packages/backend/test/auth-flow.e2e.test.ts`, and rename the request body field from `signature` to `proof`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm -w @sidesa/backend run test -- auth`
Expected: FAIL — the service still verifies an ECDSA signature, so a Schnorr proof does not validate.

- [ ] **Step 4: Migrate the service**

In `packages/backend/src/auth/auth.service.ts`, replace the `verifyMessage` import and call:

```ts
import { verifyKnowledge, decodeProof } from '@sidesa/crypto';

// ... inside verify(), replacing the old ECDSA check:
    let ok = false;
    try {
      ok = verifyKnowledge(
        hexToBytes(account.publicKey),
        decodeProof(hexToBytes(proofHex)),
        buildAuthMessage(accountId, nonce),
      );
    } catch {
      ok = false; // malformed proof bytes are simply a failed authentication
    }
    if (!ok) return { ok: false };
```

Rename the parameter `signatureHex` to `proofHex` throughout the method.

- [ ] **Step 5: Update the DTO and controller**

`packages/backend/src/auth/auth.dto.ts` exports `SIG_HEX` (192 hex), which
`letters/letter.dto.ts` and `registry/registry.dto.ts` both import and still need — those flows keep
using ECDSA until Tahap 2. **Do not remove or repoint `SIG_HEX`.** Add a second constant beside it and
use that one here:

```ts
/// Compact ECDSA P-384 signature: r||s, 96 bytes -> 192 hex chars.
export const SIG_HEX = /^[0-9a-fA-F]{192}$/;

/// Schnorr proof of knowledge: R||s, 97 bytes -> 194 hex chars.
export const PROOF_HEX = /^[0-9a-fA-F]{194}$/;
```

Then in `VerifyDto`, replace the signature field with:

```ts
  @Matches(PROOF_HEX, { message: 'proof harus 194 karakter heksadesimal (Schnorr R||s).' })
  proof!: string;
```

In `packages/backend/src/auth/auth.controller.ts`, pass `body.proof` where it previously passed `body.signature`.

- [ ] **Step 6: Migrate the Flutter client**

In `packages/app/lib/auth/auth_service.dart`, replace the signing call with a proof call and rename the posted field:

```dart
    final proof = await keyStore.prove(Uint8List.fromList(message));
    final res = await api.postJson('/auth/verify', {
      'accountId': accountId,
      'nonce': nonce,
      'proof': bytesToHex(proof),
    });
```

Leave the message construction (`SIDESA-auth-v1|<accountId>|<nonce>`) exactly as it is.

- [ ] **Step 7: Run backend and app suites**

Run: `npm -w @sidesa/backend run test -- auth`
Expected: PASS.
Run: `npm -w @sidesa/backend run test`
Expected: no regressions.
Run: `cd packages/app && flutter test`
Expected: PASS, including `test/auth_service_test.dart` (update its mocked request body to `proof` if it asserts on it).

- [ ] **Step 8: Commit**

```bash
git add packages/backend/src/auth packages/backend/test/auth.service.test.ts packages/backend/test/auth-flow.e2e.test.ts packages/app/lib/auth/auth_service.dart packages/app/test/auth_service_test.dart
git commit -m "feat(auth): authenticate with a Schnorr proof instead of ECDSA"
```

---

### Task 5: Migrate Gate 2 — device enrolment

**Files:**
- Modify: `packages/backend/src/enroll/enroll.service.ts`
- Modify: `packages/backend/src/enroll/enroll.dto.ts`
- Modify: `packages/backend/src/enroll/enroll.controller.ts` (field rename only)
- Modify: `packages/app/lib/state/session.dart` (`daftarPerangkat`)
- Test: `packages/backend/test/enroll-flow.e2e.test.ts` (update existing)
- Test: `packages/app/test/enroll_test.dart` (update existing)

**Interfaces:**
- Consumes: `verifyKnowledge`, `decodeProof` from `@sidesa/crypto`; `KeyStore.prove`.
- Produces: `POST /enroll/claim` body becomes `{ code, publicKey, proof }` with `proof` 194 hex characters. The bound context is unchanged: `buildEnrollMessage(code, publicKeyHex)`.

- [ ] **Step 1: Update the failing tests first**

In `packages/backend/test/enroll-flow.e2e.test.ts`, build the claim proof with Schnorr instead of ECDSA (same `schnorrProofHex` helper shape as Task 4, over `buildEnrollMessage(code, pkHex)`), and rename the posted field `signature` to `proof`. Keep every existing negative test intact — in particular `rejects a claim whose proof-of-possession does not match the public key`, `refuses to reuse a code that was already claimed`, `rejects an unknown code`, and `forbids a non-operator from issuing codes`.

In `packages/app/test/enroll_test.dart`, the mock asserts the posted body; change the asserted field name to `proof` and verify it is 194 hex characters:

```dart
    final proofHex = posted!['proof'] as String;
    expect(proofHex.length, 194);
```

Keep the existing assertion that the code is normalised to `ABCDEFGH`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm -w @sidesa/backend run test -- enroll`
Expected: FAIL — the service still verifies an ECDSA signature.

- [ ] **Step 3: Migrate the service**

In `packages/backend/src/enroll/enroll.service.ts`, replace the `verifyMessage` import and the proof-of-possession check:

```ts
import { domainHash, verifyKnowledge, decodeProof } from '@sidesa/crypto';

// ... where the old code called verifyMessage(...):
      try {
        ok = verifyKnowledge(
          hexToBytes(publicKey),
          decodeProof(hexToBytes(proofHex)),
          buildEnrollMessage(code, publicKey),
        );
      } catch {
        ok = false;
      }
```

Rename the parameter `signatureHex` to `proofHex`. Leave the surrounding behaviour untouched: the generic failure message, the single transaction that burns the code and creates the account, and the 10-requests-per-minute throttle.

- [ ] **Step 4: Update the DTO and controller**

In `packages/backend/src/enroll/enroll.dto.ts`, replace the signature field of `ClaimCodeDto`,
reusing the constant added in Task 4 rather than inlining the pattern again:

```ts
import { PROOF_HEX } from '../auth/auth.dto';

  @Matches(PROOF_HEX, { message: 'proof harus 194 karakter heksadesimal (Schnorr R||s).' })
  proof!: string;
```

Leave the `publicKey` field's `/^0[23][0-9a-fA-F]{96}$/` pattern exactly as it is — the compressed public key format does not change.

In `packages/backend/src/enroll/enroll.controller.ts`, pass `body.proof`.

- [ ] **Step 5: Migrate the Flutter client**

In `daftarPerangkat` in `packages/app/lib/state/session.dart`, replace the signing call:

```dart
    final message = utf8.encode('SIDESA-enroll-v1|$normalized|$pubHex');
    final proof = await keyStore.prove(Uint8List.fromList(message));
    final res = await api.postJson('/enroll/claim', {
      'code': normalized,
      'publicKey': pubHex,
      'proof': bytesToHex(proof),
    });
```

- [ ] **Step 6: Run backend and app suites**

Run: `npm -w @sidesa/backend run test -- enroll`
Expected: PASS.
Run: `cd packages/app && flutter test test/enroll_test.dart`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/enroll packages/backend/test/enroll-flow.e2e.test.ts packages/app/lib/state/session.dart packages/app/test/enroll_test.dart
git commit -m "feat(enroll): prove key possession with Schnorr at claim time"
```

---

### Task 6: Migrate Gate 3 — eligibility ownership sub-proof

**Files:**
- Modify: `packages/crypto/src/eligibility.ts`
- Modify: `packages/app/lib/state/session.dart` (`ajukanSurat`)
- Test: `packages/crypto/test/eligibility.test.ts` (update existing)
- Test: `packages/backend/test/zkp-flow.e2e.test.ts` (update existing)

**Interfaces:**
- Consumes: `proveKnowledge`, `verifyKnowledge`, `encodeProof`, `decodeProof`, `secretFromBytes`, `derivePublic`.
- Produces: `EligibilityProof.ownership` is now a 97-byte encoded Schnorr proof rather than a 96-byte ECDSA signature. The signatures of `proveEligibility(privateKey, attributes, tree, leafIndex, context)` and `verifyEligibility(proof, signedRoot, context)` are unchanged, so callers keep compiling.

- [ ] **Step 1: Update the failing crypto tests first**

`packages/crypto/test/eligibility.test.ts` already contains the decisive negative tests — `rejects a non-member (key not in the registry)`, `rejects a replayed proof under a different request context`, `rejects attribute tampering after the proof is built`, `rejects an impersonator who copies a real public key but lacks the secret`. Keep all of them unchanged; they must pass against the new construction without modification. Add one assertion that pins the new wire size:

```ts
it('carries a 97-byte Schnorr ownership proof', () => {
  const proof = proveEligibility(kp.privateKey, attributes, tree, 0, context);
  expect(proof.ownership.length).toBe(97);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:crypto -- eligibility`
Expected: FAIL on the new assertion — ownership is currently a 96-byte ECDSA signature.

- [ ] **Step 3: Migrate the construction**

In `packages/crypto/src/eligibility.ts`, replace the ECDSA imports and the ownership computation:

```ts
import { MerkleTree, ProofStep, verifyProof } from './merkle';
import { derivePublic, secretFromBytes, proveKnowledge, verifyKnowledge, encodeProof, decodeProof } from './schnorr';
import { domainHash } from './hash';

export function proveEligibility(
  privateKey: Uint8Array,
  attributes: Uint8Array,
  tree: MerkleTree,
  leafIndex: number,
  context: Uint8Array,
): EligibilityProof {
  const secret = secretFromBytes(privateKey);
  const publicKey = derivePublic(secret);
  const merkleProof = tree.getProof(leafIndex);
  // Schnorr proof of knowledge of the scalar behind publicKey, bound to the
  // single-use request context. Reveals nothing about the secret, and a captured
  // proof is worthless under any other context.
  const ownership = encodeProof(proveKnowledge(secret, publicKey, context));
  return { publicKey, attributes, merkleProof, ownership };
}

export function verifyEligibility(
  proof: EligibilityProof,
  signedRoot: Uint8Array,
  context: Uint8Array,
): boolean {
  const leaf = computeLeaf(proof.publicKey, proof.attributes);
  if (!verifyProof(leaf, proof.merkleProof, signedRoot)) return false;
  try {
    return verifyKnowledge(proof.publicKey, decodeProof(proof.ownership), context);
  } catch {
    return false;
  }
}
```

Leave `computeLeaf` and the `EligibilityProof` interface exactly as they are.

- [ ] **Step 4: Run the crypto suite**

Run: `npm run test:crypto`
Expected: PASS, including every pre-existing eligibility negative test, unchanged.

- [ ] **Step 5: Migrate the Flutter client**

In `ajukanSurat` in `packages/app/lib/state/session.dart`, replace the ownership computation:

```dart
    final context = utf8.encode('SIDESA-letter-eligibility-v1|$accountId|$type|$nonce');
    final ownership = await keyStore.prove(Uint8List.fromList(context));
```

The rest of the eligibility payload (`publicKey`, `attributes`, `merkleProof`, `ownership`) keeps the same shape.

- [ ] **Step 6: Run backend and app suites**

Run: `npm -w @sidesa/backend run test -- zkp-flow`
Expected: PASS — the end-to-end eligibility gate still admits a valid resident and still rejects a replayed nonce.
Run: `cd packages/app && flutter test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/crypto/src/eligibility.ts packages/crypto/test/eligibility.test.ts packages/app/lib/state/session.dart
git commit -m "feat(crypto): eligibility ownership becomes a Schnorr proof"
```

---

### Task 7: Guard the gates against an ECDSA regression

**Files:**
- Create: `packages/backend/test/no-ecdsa-in-gates.test.ts`

**Interfaces:**
- Consumes: nothing at runtime; the test reads source files from disk.
- Produces: a regression guard asserting the three gate services never import ECDSA sign/verify.

- [ ] **Step 1: Write the failing-by-construction guard test**

```ts
// packages/backend/test/no-ecdsa-in-gates.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The identity gates must rest on one primitive. ECDSA may still appear in the
// letter subsystem (removed in Tahap 2), but never in these three files.
// eligibility.service.ts delegates to the crypto package, so the file that has
// to be guarded for gate 3 is the library construction itself.
const gates = [
  '../src/auth/auth.service.ts',
  '../src/enroll/enroll.service.ts',
  '../../crypto/src/eligibility.ts',
];

describe('identity gates contain no ECDSA', () => {
  for (const rel of gates) {
    it(`${rel} does not use signMessage or verifyMessage`, () => {
      const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
      expect(src).not.toMatch(/\bverifyMessage\b/);
      expect(src).not.toMatch(/\bsignMessage\b/);
    });
  }
});
```

- [ ] **Step 2: Run it**

Run: `npm -w @sidesa/backend run test -- no-ecdsa-in-gates`
Expected: PASS — Tasks 4, 5 and 6 already removed those calls. If any file still matches, that gate
was not fully migrated; fix the gate rather than the test. Note that `registry/eligibility.service.ts`
is intentionally not in the list: it never calls ECDSA directly, it delegates to `verifyEligibility`,
so guarding `packages/crypto/src/eligibility.ts` is what actually protects gate 3.

- [ ] **Step 3: Run every suite end to end**

Run: `npm run db:up` (if Postgres is not already running), then:

```bash
npm run test:crypto
npm -w @sidesa/backend run test
cd packages/app && flutter test
```

Expected: all green. Crypto grows by the codec, interop and eligibility-size tests; backend grows by the guard test; the app grows by the Schnorr and key-store tests.

- [ ] **Step 4: Re-emit and re-verify the interop vector**

Run: `cd packages/app && flutter test test/schnorr_test.dart` then `npm run test:crypto -- interop.schnorr`
Expected: the Schnorr interop test runs (not skipped) and passes, proving a Dart-produced proof verifies in TypeScript after all three gates were migrated.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/test/no-ecdsa-in-gates.test.ts
git commit -m "test(backend): guard the identity gates against an ECDSA regression"
```

---

## Out of Scope (deliberately deferred to Tahap 2)

Deleting the letter subsystem, `ecdsa.ts` (TypeScript and Dart), `android_keystore.dart`, and the PDF/QR code; building the appointment and slot subsystem; and the public "now serving" display. This plan deliberately leaves ECDSA in place for the letter flow so the application keeps working end to end while the identity layer is migrated underneath it.

## Self-Review

**Spec coverage.** Spec §2.1 item 3 (auth and enrolment on Schnorr) → Tasks 4 and 5. §4.1 (one primitive, existing module revived) → Tasks 1 and 2. §4.2 gates 1–3 with their exact context strings → Tasks 4, 5, 6; the context strings are unchanged from the current code, which the tasks state explicitly. §4.5 (wire format and domain separation) → Tasks 1 and 2, with the Dart `schnorrDomainHash` mirroring the TypeScript length-prefixing. §4.6 (hardware keys can no longer be used) → Task 3, encoded as a throwing `prove`. §7 (retire ECDSA from the gates) → Task 7's guard; full retirement of `ecdsa.ts` is Tahap 2 and is listed as out of scope. Spec §4.3 (registry) and §6 (data model) need no change in this plan, because the public-key format is unchanged — stated as a verified fact in Global Constraints.

**Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N". Every code step carries the code. The one instruction to read before editing (Task 4 Step 1) is a comprehension step, not a placeholder, and the subsequent steps give the exact replacement code.

**Type consistency.** `SchnorrProof {R, s}` (existing) is used identically in Tasks 1 and 6. `encodeProof`/`decodeProof`/`secretFromBytes`/`PROOF_BYTES` are defined in Task 1 and consumed with the same names in Tasks 4, 5, 6. Dart `proveKnowledgeEncoded(privateKey, publicKey, context)` is defined in Task 2 and called in Task 3; `KeyStore.prove(context)` is defined in Task 3 and called in Tasks 4, 5, 6. The wire field is named `proof` consistently across DTOs, controllers and the Flutter client, at 194 hex characters everywhere.
