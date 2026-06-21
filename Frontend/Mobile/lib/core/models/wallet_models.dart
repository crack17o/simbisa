class MobileMoneyAccount {
  MobileMoneyAccount({
    required this.id,
    required this.operateur,
    required this.numeroTelephone,
    required this.devise,
    required this.isActive,
  });

  final int id;
  final String operateur;
  final String numeroTelephone;
  final String devise;
  final bool isActive;

  factory MobileMoneyAccount.fromJson(Map<String, dynamic> json) {
    return MobileMoneyAccount(
      id: json['id'] as int,
      operateur: json['operateur'] as String? ?? 'illicocash',
      numeroTelephone: json['numero_telephone'] as String? ?? '',
      devise: json['devise'] as String? ?? 'USD',
      isActive: json['is_active'] != false,
    );
  }
}
