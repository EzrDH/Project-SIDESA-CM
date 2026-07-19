import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'ecdsa.dart';
import 'keystore.dart';
import 'schnorr.dart';

/// KeyStore backed by Android Keystore (StrongBox/TEE), with a biometric prompt
/// on every signature. The private key never enters Dart memory; only the
/// compact 96-byte low-S ECDSA signature crosses the channel.
class AndroidKeyStore implements KeyStore {
  static const MethodChannel _ch = MethodChannel('sidesa/keystore');
  final String alias;
  const AndroidKeyStore({this.alias = 'sidesa-identity'});

  /// True when the device has an enrolled strong biometric + secure lock screen.
  static Future<bool> isAvailable() async {
    try {
      return (await _ch.invokeMethod<bool>('isAvailable')) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Create the hardware key if absent; returns its compressed public key.
  Future<Uint8List> ensureKey() async {
    final hex = await _ch.invokeMethod<String>('generateKey', {'alias': alias});
    return hexToBytes(hex!);
  }

  @override
  Future<Uint8List> publicKey() async {
    final hex = await _ch.invokeMethod<String>('getPublicKey', {'alias': alias});
    return hexToBytes(hex!);
  }

  @override
  Future<Uint8List> sign(Uint8List message) async {
    final hex = await _ch.invokeMethod<String>('sign', {
      'alias': alias,
      'messageHex': bytesToHex(message),
      'reason': 'Verifikasi sidik jari untuk melanjutkan',
    });
    return hexToBytes(hex!);
  }

  @override
  Future<SchnorrProof> proveKnowledge(Uint8List context) {
    // Hardware keys expose only ECDSA — never the raw scalar Schnorr needs.
    throw UnsupportedError(
        'Bukti Schnorr tidak didukung kunci hardware. Gate eligibility warga '
        'perlu kunci software, atau migrasi ownership ke ECDSA-over-context.');
  }
}
