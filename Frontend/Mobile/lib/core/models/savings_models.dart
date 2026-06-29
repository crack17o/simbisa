class SavingsAccount {
  SavingsAccount({
    required this.id,
    required this.devise,
    required this.symbole,
    required this.solde,
    required this.objectifMontant,
    required this.objectifDescription,
    required this.progressionPct,
  });

  final int id;
  final String devise;
  final String symbole;
  final double solde;
  final double? objectifMontant;
  final String objectifDescription;
  final double progressionPct;

  double get goal => objectifMontant ?? 0;
  double get percent => goal > 0 ? (solde / goal).clamp(0.0, 1.0) : 0;

  factory SavingsAccount.fromJson(Map<String, dynamic> json) {
    return SavingsAccount(
      id: json['id'] as int,
      devise: json['devise'] as String? ?? 'USD',
      symbole: json['symbole'] as String? ?? '\$',
      solde: double.tryParse(json['solde']?.toString() ?? '') ?? 0,
      objectifMontant: json['objectif_montant'] != null
          ? double.tryParse(json['objectif_montant'].toString())
          : null,
      objectifDescription: json['objectif_description'] as String? ?? '',
      progressionPct: (json['progression_pct'] as num?)?.toDouble() ?? 0,
    );
  }
}

class SavingsOperation {
  SavingsOperation({
    required this.id,
    required this.typeOperation,
    required this.montant,
    required this.soldeApres,
    required this.dateOperation,
    required this.symbole,
    this.modePaiement = '',
    this.numeroPaiement = '',
  });

  final int id;
  final String typeOperation;
  final double montant;
  final double soldeApres;
  final String? dateOperation;
  final String symbole;
  final String modePaiement;
  final String numeroPaiement;

  bool get isDepot => typeOperation == 'depot';

  factory SavingsOperation.fromJson(Map<String, dynamic> json) {
    return SavingsOperation(
      id: json['id'] as int,
      typeOperation: json['type_operation'] as String? ?? 'depot',
      montant: double.tryParse(json['montant']?.toString() ?? '') ?? 0,
      soldeApres: double.tryParse(json['solde_apres']?.toString() ?? '') ?? 0,
      dateOperation: json['date_operation'] as String?,
      symbole: json['symbole'] as String? ?? '\$',
      modePaiement: json['mode_paiement'] as String? ?? '',
      numeroPaiement: json['numero_paiement'] as String? ?? '',
    );
  }
}
