import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart' show generateKeyPair, bytesToHex;
import 'package:sidesa_app/crypto/schnorr.dart';

void main() {
  test('domainHash known-answer test (cross-language with TypeScript)', () {
    // Cross-language known-answer test: this exact hex is asserted against
    // both this schnorrDomainHash() and TypeScript's domainHash() in
    // packages/crypto/test/schnorr.codec.test.ts. It exists so the two
    // languages can be checked against a fixed, hardcoded target instead of
    // relying on a shared artefact written by one suite and read by the
    // other (see the interop vector below, and
    // packages/crypto/test/interop.schnorr.test.ts, for why that alone was
    // unsound). If you change the domain construction on one side, this
    // constant will only catch you if you remember to update it on BOTH
    // sides — that mismatch is exactly the bug this test is designed to
    // catch.
    const expectedHex =
        'c604367af3418e34ffa9036605a4ad3df942b7c2dbab90ccb25443870b458c79eae0ae55c7487fd506f8bd6ff8d14676';
    final h = schnorrDomainHash('SIDESA-schnorr-v1', [
      Uint8List.fromList(utf8.encode('kat-publicKey')),
      Uint8List.fromList(utf8.encode('kat-R')),
      Uint8List.fromList(utf8.encode('kat-context')),
    ]);
    expect(bytesToHex(h), expectedHex);
  });

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
