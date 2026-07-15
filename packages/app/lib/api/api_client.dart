import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;
  final http.Client _client;

  /// Bearer token attached to every request once the user is logged in.
  String? authToken;

  ApiClient(this.baseUrl, {http.Client? client}) : _client = client ?? http.Client();

  Map<String, String> _headers() => {
        'content-type': 'application/json',
        if (authToken != null) 'authorization': 'Bearer $authToken',
      };

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    final res = await _client.post(Uri.parse('$baseUrl$path'), headers: _headers(), body: jsonEncode(body));
    if (res.statusCode >= 400) {
      throw Exception('Request $path gagal (${res.statusCode}).');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<dynamic> getJson(String path) async {
    final res = await _client.get(Uri.parse('$baseUrl$path'), headers: _headers());
    if (res.statusCode >= 400) {
      throw Exception('Request $path gagal (${res.statusCode}).');
    }
    return jsonDecode(res.body);
  }
}
