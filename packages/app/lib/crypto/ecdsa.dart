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
