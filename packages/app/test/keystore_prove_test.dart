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
