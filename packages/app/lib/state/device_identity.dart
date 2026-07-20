import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Who this device belongs to, learned once during enrolment and kept locally
/// so later launches only need a biometric unlock.
class DeviceIdentity {
  final String accountId;
  final String role;
  final String displayName;
  const DeviceIdentity({required this.accountId, required this.role, required this.displayName});

  Map<String, dynamic> toJson() => {'accountId': accountId, 'role': role, 'displayName': displayName};

  static DeviceIdentity fromJson(Map<String, dynamic> j) => DeviceIdentity(
        accountId: j['accountId'] as String,
        role: (j['role'] as String?) ?? 'WARGA',
        displayName: (j['displayName'] as String?) ?? '',
      );
}

/// Persists the enrolled identity. Only the account id and display name live
/// here — never a private key, which stays in the Android Keystore.
abstract class DeviceIdentityStore {
  Future<DeviceIdentity?> load();
  Future<void> save(DeviceIdentity identity);
  Future<void> clear();
}

class SecureDeviceIdentityStore implements DeviceIdentityStore {
  static const _key = 'sidesa.identity.v1';
  final FlutterSecureStorage _storage;
  const SecureDeviceIdentityStore([this._storage = const FlutterSecureStorage()]);

  @override
  Future<DeviceIdentity?> load() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null || raw.isEmpty) return null;
      return DeviceIdentity.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null; // unreadable store -> treat as not enrolled
    }
  }

  @override
  Future<void> save(DeviceIdentity identity) =>
      _storage.write(key: _key, value: jsonEncode(identity.toJson()));

  @override
  Future<void> clear() => _storage.delete(key: _key);
}

/// In-memory stand-in for tests.
class InMemoryDeviceIdentityStore implements DeviceIdentityStore {
  DeviceIdentity? _value;
  InMemoryDeviceIdentityStore([this._value]);

  @override
  Future<DeviceIdentity?> load() async => _value;

  @override
  Future<void> save(DeviceIdentity identity) async => _value = identity;

  @override
  Future<void> clear() async => _value = null;
}
