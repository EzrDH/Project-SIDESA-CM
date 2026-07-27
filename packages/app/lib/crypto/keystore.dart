import 'dart:typed_data';
import 'ecdsa.dart';
import 'schnorr.dart';

abstract class KeyStore {
  Future<Uint8List> publicKey();

  /// ECDSA signature. Still used by the letter subsystem, which Tahap 2 removes.
  Future<Uint8List> sign(Uint8List message);

  /// Schnorr proof of knowledge bound to [context], 97 bytes (R || s).
  /// This is what the identity gates use.
  Future<Uint8List> prove(Uint8List context);
}

/// Test/dev impl holding the scalar in memory. Schnorr needs the scalar itself,
/// which hardware-backed stores never expose — see AndroidKeyStore.prove.
class InMemoryKeyStore implements KeyStore {
  final Uint8List _privateKey;
  InMemoryKeyStore(this._privateKey);

  @override
  Future<Uint8List> publicKey() async => publicKeyFromPrivate(_privateKey);

  @override
  Future<Uint8List> sign(Uint8List message) async => signMessage(_privateKey, message);

  @override
  Future<Uint8List> prove(Uint8List context) async =>
      proveKnowledgeEncoded(_privateKey, publicKeyFromPrivate(_privateKey), context);
}
