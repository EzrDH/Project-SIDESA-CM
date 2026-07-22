/// Boundary over FCM so the app builds and tests run without Firebase.
abstract class PushMessagingAdapter {
  /// The current registration token, or null when push is unavailable.
  Future<String?> obtainToken();
  /// Register a callback for token rotation.
  void onTokenRefresh(void Function(String) cb);
}

/// Default: push disabled. Used in tests and when Firebase is not configured.
class NoopPushAdapter implements PushMessagingAdapter {
  @override
  Future<String?> obtainToken() async => null;
  @override
  void onTokenRefresh(void Function(String) cb) {}
}
