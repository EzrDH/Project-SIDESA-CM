import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  final String baseUrl;
  final http.Client _client;
  ApiClient(this.baseUrl, {http.Client? client}) : _client = client ?? http.Client();

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    final res = await _client.post(
      Uri.parse('$baseUrl$path'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode(body),
    );
    if (res.statusCode >= 400) {
      throw Exception('Request $path gagal (${res.statusCode}).');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
