import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sidesa_app/api/api_client.dart';
import 'package:sidesa_app/crypto/ecdsa.dart';
import 'package:sidesa_app/crypto/keystore.dart';
import 'package:sidesa_app/push/push_messaging_adapter.dart';
import 'package:sidesa_app/state/session.dart';

class FakePushAdapter implements PushMessagingAdapter {
  final String? token;
  FakePushAdapter(this.token);
  @override
  Future<String?> obtainToken() async => token;
  @override
  void onTokenRefresh(void Function(String) cb) {}
}

void main() {
  test('registers the FCM token after login and unregisters on logout', () async {
    final requests = <String>[];
    final mock = MockClient((req) async {
      requests.add('${req.method} ${req.url.path}');
      if (req.url.path == '/auth/challenge') return http.Response(jsonEncode({'nonce': 'n1'}), 201);
      if (req.url.path == '/auth/verify') return http.Response(jsonEncode({'token': 'jwt', 'role': 'WARGA'}), 201);
      if (req.url.path == '/notifications/token') {
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        expect(body['token'], 'fcm-abc');
        expect(body['platform'], 'android');
        return http.Response(jsonEncode({'ok': true}), req.method == 'DELETE' ? 200 : 201);
      }
      return http.Response('nf', 404);
    });
    final kp = generateKeyPair();
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: InMemoryKeyStore(kp.privateKey),
      push: FakePushAdapter('fcm-abc'),
    );
    await session.login('acc-1');
    expect(requests, contains('POST /notifications/token'));
    session.logout();
    await session.pendingPushWork; // flush the unregister call
    expect(requests, contains('DELETE /notifications/token'));
  });

  test('a null token (no Firebase) skips registration without error', () async {
    final requests = <String>[];
    final mock = MockClient((req) async {
      requests.add(req.url.path);
      if (req.url.path == '/auth/challenge') return http.Response(jsonEncode({'nonce': 'n1'}), 201);
      if (req.url.path == '/auth/verify') return http.Response(jsonEncode({'token': 'jwt', 'role': 'WARGA'}), 201);
      return http.Response('nf', 404);
    });
    final kp = generateKeyPair();
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: InMemoryKeyStore(kp.privateKey),
      push: FakePushAdapter(null),
    );
    await session.login('acc-1');
    expect(requests.contains('/notifications/token'), isFalse);
  });

  test('a failed token registration does not break login (best-effort)', () async {
    final requests = <String>[];
    final mock = MockClient((req) async {
      requests.add('${req.method} ${req.url.path}');
      if (req.url.path == '/auth/challenge') return http.Response(jsonEncode({'nonce': 'n1'}), 201);
      if (req.url.path == '/auth/verify') return http.Response(jsonEncode({'token': 'jwt', 'role': 'WARGA'}), 201);
      if (req.url.path == '/notifications/token') return http.Response('server error', 500);
      return http.Response('nf', 404);
    });
    final kp = generateKeyPair();
    final session = Session(
      api: ApiClient('http://test', client: mock),
      keyStore: InMemoryKeyStore(kp.privateKey),
      push: FakePushAdapter('fcm-abc'),
    );
    await session.login('acc-1'); // must not throw despite the 500
    expect(session.isLoggedIn, isTrue);
    expect(requests, contains('POST /notifications/token'));
  });
}
