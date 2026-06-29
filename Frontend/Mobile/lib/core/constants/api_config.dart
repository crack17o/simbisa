/// Configuration API backend Simbisa.
///
/// Production : domaine VPS avec HTTPS.
/// Dev local (téléphone sur Wi-Fi) : remplacer baseUrl par 'http://192.168.x.x:8000/api/v1'.
/// Dev local (émulateur Android)   : remplacer par 'http://10.0.2.2:8000/api/v1'.
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = 'https://srv1768871.hstgr.cloud/api/v1';

  static Uri uri(String path) {
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse('$baseUrl/$normalized');
  }

  static String get healthUrl => 'https://srv1768871.hstgr.cloud/health/';
}
