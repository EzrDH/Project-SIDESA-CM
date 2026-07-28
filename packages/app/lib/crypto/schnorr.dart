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
