/// Opérateur Mobile Money RDC déduit du numéro inscrit (+243…).
///
/// Le numéro d'inscription est le même que celui analysé pour le scoring
/// Mobile Money côté backend.
class MobileMoneyOperator {
  const MobileMoneyOperator({
    required this.code,
    required this.label,
    required this.serviceName,
    required this.prefixes,
  });

  final String code;
  final String label;
  final String serviceName;
  final List<String> prefixes;

  static const vodacom = MobileMoneyOperator(
    code: 'vodacom',
    label: 'Vodacom Congo',
    serviceName: 'M-Pesa / illicocash',
    prefixes: ['081', '082', '083', '81', '82', '83'],
  );

  static const orange = MobileMoneyOperator(
    code: 'orange',
    label: 'Orange RDC',
    serviceName: 'Orange Money',
    prefixes: ['080', '084', '085', '089', '80', '84', '85', '89'],
  );

  static const airtel = MobileMoneyOperator(
    code: 'airtel',
    label: 'Airtel RDC',
    serviceName: 'Airtel Money',
    prefixes: ['097', '098', '099', '97', '98', '99'],
  );

  static const africell = MobileMoneyOperator(
    code: 'africell',
    label: 'Africell RDC',
    serviceName: 'Afrimoney',
    prefixes: ['090', '091', '90', '91'],
  );

  static const all = [vodacom, orange, airtel, africell];

  /// Extrait les chiffres nationaux (9 chiffres) depuis +243… ou 0…
  static String nationalDigits(String raw) {
    var phone = raw.replaceAll(' ', '').replaceAll('-', '');
    if (phone.startsWith('+243')) {
      phone = phone.substring(4);
    } else if (phone.startsWith('243')) {
      phone = phone.substring(3);
    }
    if (phone.startsWith('0') && phone.length > 9) {
      phone = phone.substring(1);
    }
    return phone.replaceAll(RegExp(r'\D'), '');
  }

  static MobileMoneyOperator? fromPhone(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final digits = nationalDigits(raw);
    if (digits.length < 2) return null;

    // Préfixe local à 3 chiffres (081…) si le numéro commence par 0
    final cleaned = raw.replaceAll(' ', '').replaceAll('-', '');
    if (cleaned.startsWith('0') && cleaned.length >= 3) {
      final local3 = cleaned.substring(0, 3);
      for (final op in all) {
        if (op.prefixes.contains(local3)) return op;
      }
    }

    // Format international : +243 81… → 81, 90, 99…
    final p2 = digits.substring(0, 2);
    final p3 = digits.length >= 3 ? digits.substring(0, 3) : '';

    for (final op in all) {
      if (op.prefixes.contains(p3) || op.prefixes.contains(p2)) return op;
    }
    return null;
  }

  static String describeForPhone(String? phone) {
    final op = fromPhone(phone);
    if (op == null) return 'Réseau non identifié';
    return '${op.label} · ${op.serviceName}';
  }
}
