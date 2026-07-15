import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';

void main() {
  test('emits an interop vector for @sidesa/crypto to verify', () {
    final kp = generateKeyPair();
    final message = Uint8List.fromList(utf8.encode('SIDESA-auth-v1|acc-XYZ|nonce-123'));
    final sig = signMessage(kp.privateKey, message);
    final vector = {
      'publicKey': bytesToHex(kp.publicKey),
      'message': bytesToHex(message),
      'signature': bytesToHex(sig),
    };
    final f = File('build/interop_vector.json');
    f.createSync(recursive: true);
    f.writeAsStringSync(jsonEncode(vector));
    expect(f.existsSync(), isTrue);
  });
}
