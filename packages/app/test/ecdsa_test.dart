import 'dart:convert';
import 'dart:typed_data';
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
    final msg = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-1|nonce-abc'));
    final sig = signMessage(kp.privateKey, msg);
    expect(sig.length, 96);
    expect(verifyMessage(kp.publicKey, msg, sig), isTrue);
  });

  test('rejects a tampered message', () {
    final kp = generateKeyPair();
    final sig = signMessage(kp.privateKey, Uint8List.fromList(utf8.encode('a')));
    expect(verifyMessage(kp.publicKey, Uint8List.fromList(utf8.encode('b')), sig), isFalse);
  });

  test('produces a low-S signature', () {
    final kp = generateKeyPair();
    final sig = signMessage(kp.privateKey, Uint8List.fromList(utf8.encode('x')));
    final s = BigInt.parse(bytesToHex(Uint8List.fromList(sig.sublist(48, 96))), radix: 16);
    final n = BigInt.parse(
        'ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973',
        radix: 16);
    expect(s <= (n >> 1), isTrue);
  });
}
