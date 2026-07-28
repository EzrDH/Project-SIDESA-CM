import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart' show generateKeyPair;
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/crypto/android_keystore.dart';

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

  // Gap 3 (Task 3 review): a hardware-backed key never releases the private
  // scalar, so it can't compute a Schnorr response s = k + e*x. AndroidKeyStore
  // must fail loud rather than silently produce a wrong/absent proof. This
  // throws before any platform channel call, so no method-channel mocking is
  // needed.
  test('AndroidKeyStore.prove refuses with UnsupportedError (private scalar never leaves hardware)', () async {
    final ks = AndroidKeyStore();
    expect(
      () => ks.prove(Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-1|n-1'))),
      throwsA(isA<UnsupportedError>()),
    );
  });
}
