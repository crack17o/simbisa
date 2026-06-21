/// Configuration API backend Simbisa.
///
/// Téléphone physique sur le même Wi-Fi : IP LAN de la machine qui héberge Django.
/// Émulateur Android : remplacer par `10.0.2.2`.
class ApiConfig {
  ApiConfig._();

  /// IP de la machine qui exécute le backend Django.
  static const String host = '192.168.1.163';
  static const int port = 8000;

  static const String baseUrl = 'http://$host:$port/api/v1';

  static Uri uri(String path) {
    final normalized = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse('$baseUrl/$normalized');
  }

  static String get healthUrl => 'http://$host:$port/health/';
}
