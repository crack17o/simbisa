import '../utils/formatters.dart';

class CreditDemandeItem {
  CreditDemandeItem({
    required this.demandeId,
    required this.devise,
    required this.symbole,
    required this.montantDemande,
    required this.dureeMois,
    required this.motif,
    required this.statut,
    required this.dateDemande,
    this.credit,
  });

  final int demandeId;
  final String devise;
  final String symbole;
  final double montantDemande;
  final int dureeMois;
  final String motif;
  final String statut;
  final String? dateDemande;
  final ActiveCredit? credit;

  String get displayId => '#CR-${demandeId.toString().padLeft(3, '0')}';
  String get statutLabel => formatStatutLabel(statut);
  String get formattedDate => formatDate(dateDemande);

  double? get mensualite => credit?.mensualite;
  double get montantAffiche => credit?.montantAccorde ?? montantDemande;

  factory CreditDemandeItem.fromJson(Map<String, dynamic> json) {
    final creditJson = json['credit'] as Map<String, dynamic>?;
    return CreditDemandeItem(
      demandeId: json['demande_id'] as int,
      devise: json['devise'] as String? ?? 'USD',
      symbole: json['symbole'] as String? ?? '\$',
      montantDemande: double.tryParse(json['montant_demande']?.toString() ?? '') ?? 0,
      dureeMois: json['duree_mois'] as int? ?? 0,
      motif: json['motif'] as String? ?? '',
      statut: json['statut'] as String? ?? 'en_analyse',
      dateDemande: json['date_demande'] as String?,
      credit: creditJson != null ? ActiveCredit.fromJson(creditJson) : null,
    );
  }
}

class ActiveCredit {
  ActiveCredit({
    required this.id,
    required this.montantAccorde,
    required this.mensualite,
    required this.soldeRestant,
    required this.statut,
    required this.progressionRemboursement,
    required this.dateDebut,
    required this.dateFin,
  });

  final int id;
  final double montantAccorde;
  final double mensualite;
  final double soldeRestant;
  final String statut;
  final double progressionRemboursement;
  final String? dateDebut;
  final String? dateFin;

  factory ActiveCredit.fromJson(Map<String, dynamic> json) {
    return ActiveCredit(
      id: json['id'] as int,
      montantAccorde: double.tryParse(json['montant_accorde']?.toString() ?? '') ?? 0,
      mensualite: double.tryParse(json['mensualite']?.toString() ?? '') ?? 0,
      soldeRestant: double.tryParse(json['solde_restant']?.toString() ?? '') ?? 0,
      statut: json['statut'] as String? ?? 'en_cours',
      progressionRemboursement:
          double.tryParse(json['progression_remboursement']?.toString() ?? '') ?? 0,
      dateDebut: json['date_debut'] as String?,
      dateFin: json['date_fin'] as String?,
    );
  }
}

class CreditSubmitResult {
  CreditSubmitResult({
    required this.demandeId,
    required this.statut,
    required this.devise,
    this.decision,
    this.motif,
    this.explicationIa,
    this.scoreGlobal,
    required this.timedOut,
  });

  final int demandeId;
  final String statut;
  final String devise;
  final String? decision;
  final String? motif;
  final String? explicationIa;
  final double? scoreGlobal;
  final bool timedOut;

  bool get isApproved => decision == 'approuve' || statut == 'approuve';
  bool get isRejected => decision == 'rejete' || statut == 'rejete';
  bool get isPending => decision == 'mise_en_attente' || statut == 'en_analyse';
}

String formatStatutLabel(String statut) => statutLabel(statut);
