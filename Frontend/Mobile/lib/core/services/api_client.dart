import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../constants/api_config.dart';
import 'local_storage.dart';
import 'session.dart';

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

  // Singleton refresh : si plusieurs requêtes expirent en même temps,
  // une seule tentative de refresh est faite. Les autres attendent le résultat.
  Future<bool>? _pendingRefresh;

  // ── Méthodes publiques ────────────────────────────────────────────────────

  Future<Map<String, dynamic>> get(String path, {bool auth = true}) =>
      _request('GET', path, auth: auth);

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body, bool auth = true}) =>
      _request('POST', path, body: body, auth: auth);

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? body, bool auth = true}) =>
      _request('PATCH', path, body: body, auth: auth);

  Future<Map<String, dynamic>> delete(String path, {bool auth = true}) =>
      _request('DELETE', path, auth: auth);

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required Map<String, String> fields,
    List<int>? fileBytes,
    String? fileFieldName,
    String? fileName,
    bool auth = true,
  }) async {
    final uri = ApiConfig.uri(path);
    final request = http.MultipartRequest('POST', uri);
    request.headers['X-Device-Id'] = 'simbisa-mobile';
    if (auth) {
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
    }
    request.fields.addAll(fields);
    if (fileBytes != null && fileFieldName != null && fileName != null) {
      request.files.add(
        http.MultipartFile.fromBytes(fileFieldName, fileBytes, filename: fileName),
      );
    }
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _parse(response);
  }

  Future<Uint8List> fetchAuthBytes(String absoluteUrl) async {
    final token = await _storage.getAccessToken();
    final headers = <String, String>{
      'X-Device-Id': 'simbisa-mobile',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse(absoluteUrl);
    final res = await http.get(uri, headers: headers);
    if (res.statusCode >= 200 && res.statusCode < 300) return res.bodyBytes;
    throw ApiException('Accès refusé (${res.statusCode})', statusCode: res.statusCode);
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  Future<bool> _doRefresh() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final uri = ApiConfig.uri('auth/token/refresh/');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode({'refresh': refreshToken}),
      );
      if (res.statusCode != 200) return false;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      await _storage.saveTokens(
        access: data['access'] as String,
        refresh: (data['refresh'] as String?) ?? refreshToken,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _refreshToken() {
    _pendingRefresh ??= _doRefresh().whenComplete(() => _pendingRefresh = null);
    return _pendingRefresh!;
  }

  // ── Requête interne ───────────────────────────────────────────────────────

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
    bool retried = false,
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
    final response = await _execute(method, uri, headers, body);

    if (response.statusCode == 401 && auth && !retried) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        return _request(method, path, body: body, auth: auth, retried: true);
      }
      await _storage.clear();
      Session.current = null;
      Session.onExpired?.call();
      throw ApiException(
        'Session expirée. Veuillez vous reconnecter.',
        statusCode: 401,
        code: 'session_expired',
      );
    }

    return _parse(response);
  }

  Future<http.Response> _execute(
    String method,
    Uri uri,
    Map<String, String> headers,
    Map<String, dynamic>? body,
  ) {
    final encoded = body != null ? jsonEncode(body) : null;
    switch (method) {
      case 'GET':    return http.get(uri, headers: headers);
      case 'POST':   return http.post(uri, headers: headers, body: encoded);
      case 'PATCH':  return http.patch(uri, headers: headers, body: encoded);
      case 'DELETE': return http.delete(uri, headers: headers);
      default:       throw ApiException('Méthode HTTP non supportée : $method');
    }
  }

  Map<String, dynamic> _parse(http.Response response) {
    Map<String, dynamic>? decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {}
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
