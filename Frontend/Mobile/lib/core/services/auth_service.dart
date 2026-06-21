import 'api_client.dart';
import 'local_storage.dart';
import 'session.dart';

class AuthService {
  AuthService({
    ApiClient? api,
    LocalStorage? storage,
  })  : _api = api ?? ApiClient(),
        _storage = storage ?? LocalStorage();

  final ApiClient _api;
  final LocalStorage _storage;

  static String normalizePhone(String raw) {
    var phone = raw.replaceAll(' ', '').replaceAll('-', '');
    if (phone.startsWith('243') && !phone.startsWith('+')) {
      phone = '+$phone';
    }
    if (!phone.startsWith('+243')) {
      throw ApiException('Numéro DRC requis (format +243XXXXXXXXX).');
    }
    return phone;
  }

  Future<SessionUser> login({
    required String telephone,
    required String password,
    String? otpCode,
  }) async {
    final body = <String, dynamic>{
      'telephone': normalizePhone(telephone),
      'password': password,
    };
    if (otpCode != null && otpCode.isNotEmpty) {
      body['otp_code'] = otpCode;
    }

    final res = await _api.post('auth/login/', body: body, auth: false);

    if (res['requires_otp'] == true) {
      throw ApiException(
        res['message'] as String? ?? 'Code OTP requis. Vérifiez votre e-mail.',
        code: 'otp_required',
      );
    }

    final data = res['data'] as Map<String, dynamic>?;
    if (data == null) throw ApiException('Réponse login invalide.');

    final tokens = data['tokens'] as Map<String, dynamic>;
    await _storage.saveTokens(
      access: tokens['access'] as String,
      refresh: tokens['refresh'] as String,
    );

    final user = SessionUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.saveSession(user);
    Session.current = user;
    return user;
  }

  Future<RegisterResult> register({
    required String telephone,
    required String nom,
    required String prenom,
    required String password,
    required String communeKinshasa,
    String postnom = '',
    String? email,
  }) async {
    final trimmedEmail = email?.trim();
    final body = <String, dynamic>{
      'telephone': normalizePhone(telephone),
      'nom': nom,
      'postnom': postnom,
      'prenom': prenom,
      'password': password,
      'password_confirm': password,
      'commune_kinshasa': communeKinshasa,
    };
    if (trimmedEmail != null && trimmedEmail.isNotEmpty) {
      body['email'] = trimmedEmail;
    }

    final res = await _api.post('auth/register/', body: body, auth: false);
    final data = res['data'] as Map<String, dynamic>?;
    if (data == null) throw ApiException('Réponse inscription invalide.');

    final tokens = data['tokens'] as Map<String, dynamic>;
    await _storage.saveTokens(
      access: tokens['access'] as String,
      refresh: tokens['refresh'] as String,
    );

    final user = SessionUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.saveSession(user);
    Session.current = user;
    return RegisterResult(
      user: user,
      welcomeEmailSent: data['welcome_email_sent'] == true,
    );
  }

  Future<List<CommuneOption>> fetchCommunes() async {
    final res = await _api.get('clients/communes/', auth: false);
    final data = res['data'] as List<dynamic>? ?? [];
    return data
        .map((e) => CommuneOption(
              code: e['code'] as String,
              label: e['label'] as String,
            ))
        .toList();
  }

  Future<void> logout() async {
    final refresh = await _storage.getRefreshToken();
    if (refresh != null) {
      try {
        await _api.post('auth/logout/', body: {'refresh': refresh}, auth: true);
      } catch (_) {
        // Ignore — on efface la session locale quand même.
      }
    }
    await _storage.clear();
    Session.current = null;
  }

  Future<SessionUser?> restoreSession() async {
    if (!await _storage.hasValidTokens()) return null;

    final cached = await _storage.loadSession();
    if (cached != null) Session.current = cached;

    try {
      final res = await _api.get('auth/me/');
      final data = res['data'] as Map<String, dynamic>?;
      if (data == null) return cached;
      final user = SessionUser.fromJson(data);
      await _storage.saveSession(user);
      Session.current = user;
      return user;
    } catch (_) {
      return cached;
    }
  }
}

class CommuneOption {
  const CommuneOption({required this.code, required this.label});
  final String code;
  final String label;
}

class RegisterResult {
  const RegisterResult({required this.user, required this.welcomeEmailSent});

  final SessionUser user;
  final bool welcomeEmailSent;
}
