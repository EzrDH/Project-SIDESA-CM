import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';

/// Dart port of `@sidesa/crypto`'s Schnorr proof-of-knowledge over P-384,
/// byte-for-byte compatible with the TypeScript verifier. Used for the ZKP
/// eligibility gate: proving ownership of the registered pseudonymous key,
/// bound to a request context, without revealing the private scalar.

final ECDomainParameters _curve = ECCurve_secp384r1();

class SchnorrProof {
  final Uint8List R; // compressed commitment point (49 bytes)
  final Uint8List s; // response scalar, 48 bytes big-endian
  SchnorrProof(this.R, this.s);
}

SecureRandom _rng() {
  final r = FortunaRandom();
  final s = Random.secure();
  r.seed(KeyParameter(Uint8List.fromList(List<int>.generate(32, (_) => s.nextInt(256)))));
  return r;
}

BigInt _bytesToBigInt(Uint8List b) {
  var r = BigInt.zero;
  for (final byte in b) {
    r = (r << 8) | BigInt.from(byte);
  }
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

Uint8List _lenPrefixed(Uint8List b) {
  final out = Uint8List(4 + b.length);
  ByteData.view(out.buffer).setUint32(0, b.length, Endian.big);
  out.setRange(4, 4 + b.length, b);
  return out;
}

/// SHA-384 over length-prefixed (domain, ...parts) — matches TS `domainHash`.
Uint8List _domainHash(String domain, List<Uint8List> parts) {
  final d = SHA384Digest();
  final dom = _lenPrefixed(Uint8List.fromList(utf8.encode(domain)));
  d.update(dom, 0, dom.length);
  for (final p in parts) {
    final lp = _lenPrefixed(p);
    d.update(lp, 0, lp.length);
  }
  final out = Uint8List(48);
  d.doFinal(out, 0);
  return out;
}

BigInt _randomScalar(SecureRandom rng, BigInt n) {
  for (;;) {
    final v = _bytesToBigInt(rng.nextBytes(64)) % n;
    if (v != BigInt.zero) return v;
  }
}

/// Prove knowledge of the scalar `x` (from `privateKey`) such that
/// `publicKeyCompressed = x*G`, bound to `context`. Verifiable by TS
/// `verifyKnowledge`.
SchnorrProof schnorrProve(Uint8List privateKey, Uint8List publicKeyCompressed, Uint8List context) {
  final n = _curve.n;
  final secret = _bytesToBigInt(privateKey) % n;
  final rng = _rng();
  for (;;) {
    final k = _randomScalar(rng, n);
    final rBytes = (_curve.G * k)!.getEncoded(true);
    final c = _bytesToBigInt(_domainHash('SIDESA-schnorr-v1', [publicKeyCompressed, rBytes, context])) % n;
    if (c == BigInt.zero) continue;
    final s = (k + c * secret) % n;
    if (s == BigInt.zero) continue;
    return SchnorrProof(rBytes, _bigIntTo48(s));
  }
}
