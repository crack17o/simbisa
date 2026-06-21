import 'package:shared_preferences/shared_preferences.dart';

import '../utils/mobile_money_operator.dart';
import 'session.dart';

/// Persistance locale (SharedPreferences) : JWT + profil session essentiel.
class LocalStorage {
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';
  static const _userIdKey = 'user_id';
  static const _telephoneKey = 'user_telephone';
  static const _fullNameKey = 'user_full_name';
  static const _roleNameKey = 'user_role_name';
  static const _communeKey = 'user_commune';
  static const _emailKey = 'user_email';
  static const _mmOperatorCodeKey = 'mm_operator_code';
  static const _mmOperatorLabelKey = 'mm_operator_label';
  static const _mmServiceNameKey = 'mm_service_name';

  Future<void> saveTokens({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessKey, access);
    await prefs.setString(_refreshKey, refresh);
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessKey);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshKey);
  }

  Future<void> saveSession(SessionUser user) async {
    final prefs = await SharedPreferences.getInstance();
    final op = user.mobileMoneyOperator;

    await prefs.setInt(_userIdKey, user.id);
    await prefs.setString(_telephoneKey, user.telephone);
    await prefs.setString(_fullNameKey, user.fullName);
    await prefs.setString(_roleNameKey, user.roleName);

    if (user.communeKinshasa != null) {
      await prefs.setString(_communeKey, user.communeKinshasa!);
    }
    if (user.email != null && user.email!.isNotEmpty) {
      await prefs.setString(_emailKey, user.email!);
    }

    if (op != null) {
      await prefs.setString(_mmOperatorCodeKey, op.code);
      await prefs.setString(_mmOperatorLabelKey, op.label);
      await prefs.setString(_mmServiceNameKey, op.serviceName);
    }
  }

  Future<SessionUser?> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getInt(_userIdKey);
    final telephone = prefs.getString(_telephoneKey);
    if (id == null || telephone == null) return null;

    final opCode = prefs.getString(_mmOperatorCodeKey);
    MobileMoneyOperator? operator;
    if (opCode != null) {
      for (final o in MobileMoneyOperator.all) {
        if (o.code == opCode) {
          operator = o;
          break;
        }
      }
    }
    operator ??= MobileMoneyOperator.fromPhone(telephone);

    return SessionUser(
      id: id,
      telephone: telephone,
      fullName: prefs.getString(_fullNameKey) ?? '',
      roleName: prefs.getString(_roleNameKey) ?? 'Client',
      email: prefs.getString(_emailKey),
      communeKinshasa: prefs.getString(_communeKey),
      mobileMoneyOperator: operator ?? MobileMoneyOperator.fromPhone(telephone),
    );
  }

  Future<bool> hasValidTokens() async {
    final access = await getAccessToken();
    return access != null && access.isNotEmpty;
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessKey);
    await prefs.remove(_refreshKey);
    await prefs.remove(_userIdKey);
    await prefs.remove(_telephoneKey);
    await prefs.remove(_fullNameKey);
    await prefs.remove(_roleNameKey);
    await prefs.remove(_communeKey);
    await prefs.remove(_emailKey);
    await prefs.remove(_mmOperatorCodeKey);
    await prefs.remove(_mmOperatorLabelKey);
    await prefs.remove(_mmServiceNameKey);
  }
}

/// Alias rétrocompatible pour [ApiClient].
typedef TokenStorage = LocalStorage;
