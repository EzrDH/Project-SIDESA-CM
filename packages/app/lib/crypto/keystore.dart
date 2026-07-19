import 'dart:typed_data';
import 'ecdsa.dart';

abstract class KeyStore {
  Future<Uint8List> publicKey();
  Future<Uint8List> sign(Uint8List message);
}

/// Test/dev impl. On device this is backed by Android Keystore (non-exportable key).
class InMemoryKeyStore implements KeyStore {
  final Uint8List _privateKey;
  InMemoryKeyStore(this._privateKey);

  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);

  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);
}
