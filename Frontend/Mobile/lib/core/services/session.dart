import '../utils/mobile_money_operator.dart';

class SessionUser {
  SessionUser({
    required this.id,
    required this.telephone,
    required this.fullName,
    required this.roleName,
    this.email,
    this.communeKinshasa,
    this.mfaEnabled = false,
    MobileMoneyOperator? mobileMoneyOperator,
  }) : mobileMoneyOperator = mobileMoneyOperator ?? MobileMoneyOperator.fromPhone(telephone);

  final int id;
  final String telephone;
  final String fullName;
  final String roleName;
  final String? email;
  final String? communeKinshasa;
  final bool mfaEnabled;
  final MobileMoneyOperator? mobileMoneyOperator;

  String get mobileMoneyDescription =>
      MobileMoneyOperator.describeForPhone(telephone);

  factory SessionUser.fromJson(Map<String, dynamic> json) {
    final telephone = json['telephone'] as String;
    return SessionUser(
      id: json['id'] as int,
      telephone: telephone,
      fullName: json['full_name'] as String? ?? '',
      roleName: json['role_name'] as String? ?? 'Client',
      email: json['email'] as String?,
      communeKinshasa: json['commune_kinshasa'] as String?,
      mfaEnabled: json['mfa_enabled'] as bool? ?? false,
      mobileMoneyOperator: MobileMoneyOperator.fromPhone(telephone),
    );
  }
}

class Session {
  static SessionUser? current;
}
