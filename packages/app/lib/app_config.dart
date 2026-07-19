class AppConfig {
  /// Backend base URL. On the Android emulator, the host machine is 10.0.2.2.
  /// Override at build time: --dart-define=SIDESA_API=http://192.168.1.10:3000
  static const String baseUrl =
      String.fromEnvironment('SIDESA_API', defaultValue: 'http://10.0.2.2:3000');

  /// Optional dev account id for real login before the enrollment UI exists.
  /// --dart-define=SIDESA_ACCOUNT=<uuid>
  static const String devAccountId =
      String.fromEnvironment('SIDESA_ACCOUNT', defaultValue: '');

  /// Optional dev private key (hex) matching the seeded account's public key.
  /// --dart-define=SIDESA_PRIVKEY=<hex>
  static const String devPrivKey =
      String.fromEnvironment('SIDESA_PRIVKEY', defaultValue: '');

  /// Use the hardware-backed, biometric-gated Android Keystore key instead of
  /// the in-memory dev key. --dart-define=SIDESA_HARDWARE=1 (or =true)
  static const bool useHardwareKey =
      bool.fromEnvironment('SIDESA_HARDWARE', defaultValue: false) ||
          String.fromEnvironment('SIDESA_HARDWARE') == '1';
}
