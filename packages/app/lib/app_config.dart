class AppConfig {
  /// Backend base URL. On the Android emulator, the host machine is 10.0.2.2.
  /// Override at build time: --dart-define=SIDESA_API=http://192.168.1.10:3000
  static const String baseUrl =
      String.fromEnvironment('SIDESA_API', defaultValue: 'http://10.0.2.2:3000');

  /// Optional dev account id for real login before the enrollment UI exists.
  /// --dart-define=SIDESA_ACCOUNT=<uuid>
  static const String devAccountId =
      String.fromEnvironment('SIDESA_ACCOUNT', defaultValue: '');
}
