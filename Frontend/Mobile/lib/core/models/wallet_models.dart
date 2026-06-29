class WalletData {
  WalletData({
    required this.id,
    required this.devise,
    required this.symbole,
    required this.numeroWallet,
    required this.solde,
    required this.statut,
  });

  final int id;
  final String devise;
  final String symbole;
  final String numeroWallet;
  final double solde;
  final String statut;

  bool get isActif => statut == 'actif';

  factory WalletData.fromJson(Map<String, dynamic> json) {
    return WalletData(
      id: json['id'] as int,
      devise: json['devise'] as String? ?? 'USD',
      symbole: json['symbole'] as String? ?? '\$',
      numeroWallet: json['numero_wallet'] as String? ?? '',
      solde: double.tryParse(json['solde']?.toString() ?? '') ?? 0,
      statut: json['statut'] as String? ?? 'actif',
    );
  }
}

class WalletTransaction {
  WalletTransaction({
    required this.id,
    required this.typeTransaction,
    required this.montant,
    required this.soldeAvant,
    required this.soldeApres,
    required this.modePaiement,
    required this.numeroPaiement,
    required this.symbole,
    required this.createdAt,
  });

  final int id;
  final String typeTransaction;
  final double montant;
  final double soldeAvant;
  final double soldeApres;
  final String modePaiement;
  final String numeroPaiement;
  final String symbole;
  final String? createdAt;

  bool get isDepot => typeTransaction == 'depot';

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] as int,
      typeTransaction: json['type_transaction'] as String? ?? 'depot',
      montant: double.tryParse(json['montant']?.toString() ?? '') ?? 0,
      soldeAvant: double.tryParse(json['solde_avant']?.toString() ?? '') ?? 0,
      soldeApres: double.tryParse(json['solde_apres']?.toString() ?? '') ?? 0,
      modePaiement: json['mode_paiement'] as String? ?? '',
      numeroPaiement: json['numero_paiement'] as String? ?? '',
      symbole: json['symbole'] as String? ?? '\$',
      createdAt: json['created_at'] as String?,
    );
  }
}

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

// Détection opérateur par préfixe DRC
const Map<String, List<String>> _kPrefixesOperateur = {
  'mpesa':        ['081', '082', '083', '084', '085'],
  'orange_money': ['086', '087', '088', '089'],
  'airtel_money': ['097', '098', '099'],
  'africell':     ['090', '091'],
};

const Map<String, String> kOperateurLabels = {
  'mpesa':        'Vodacom M-Pesa',
  'orange_money': 'Orange Money',
  'airtel_money': 'Airtel Money',
  'africell':     'Africell Money',
  'illicocash':   'Illico Cash',
};

String? detectOperateur(String numero) {
  String cleaned = numero.replaceAll(RegExp(r'[\s\-]'), '');
  if (cleaned.startsWith('00')) cleaned = '+${cleaned.substring(2)}';
  if (cleaned.startsWith('243') && !cleaned.startsWith('+')) cleaned = '+$cleaned';
  if (cleaned.length == 9 && RegExp(r'^\d+$').hasMatch(cleaned)) cleaned = '+243$cleaned';
  if (!cleaned.startsWith('+243') || cleaned.length < 7) return null;
  final prefix = cleaned.substring(4, 7);
  for (final entry in _kPrefixesOperateur.entries) {
    if (entry.value.contains(prefix)) return entry.key;
  }
  return null;
}
