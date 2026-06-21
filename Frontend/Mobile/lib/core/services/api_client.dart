import 'dart:convert';

import 'package:http/http.dart' as http;

import '../constants/api_config.dart';
import 'local_storage.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({LocalStorage? storage}) : _storage = storage ?? LocalStorage();

  final LocalStorage _storage;

  Future<Map<String, dynamic>> get(String path, {bool auth = true}) {
    return _request('GET', path, auth: auth);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) {
    return _request('POST', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) {
    return _request('PATCH', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Device-Id': 'simbisa-mobile',
    };

    if (auth) {
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    final uri = ApiConfig.uri(path);
    http.Response response;

    switch (method) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PATCH':
        response = await http.patch(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      default:
        throw ApiException('Méthode HTTP non supportée : $method');
    }

    Map<String, dynamic>? decoded;
    if (response.body.isNotEmpty) {
      decoded = jsonDecode(response.body) as Map<String, dynamic>;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded ?? {'success': true};
    }

    final error = decoded?['error'];
    final message = error is Map
        ? (error['message'] as String? ?? 'Erreur API')
        : 'Erreur API (${response.statusCode})';
    final code = error is Map ? error['code'] as String? : null;
    throw ApiException(message, statusCode: response.statusCode, code: code);
  }
}
