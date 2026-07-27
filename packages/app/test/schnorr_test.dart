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
