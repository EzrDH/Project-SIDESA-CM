import 'dart:typed_data';
import 'ecdsa.dart';
import 'schnorr.dart';

abstract class KeyStore {
  Future<Uint8List> publicKey();
  Future<Uint8List> sign(Uint8List message);

  /// Zero-knowledge proof of ownership of this key, bound to `context`.
  /// The key stays inside the store; only the proof (R, s) leaves.
  Future<SchnorrProof> proveKnowledge(Uint8List context);
}

/// Test/dev impl. On device this is backed by Android Keystore (non-exportable key).
class InMemoryKeyStore implements KeyStore {
  final Uint8List _privateKey;
  InMemoryKeyStore(this._privateKey);

  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);

  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);

  @override
  Future<SchnorrProof> proveKnowledge(Uint8List context) async =>
      schnorrProve(_privateKey, publicKeyFromPrivate(_privateKey), context);
}
