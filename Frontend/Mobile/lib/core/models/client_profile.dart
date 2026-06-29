class ClientProfile {
  ClientProfile({
    required this.id,
    required this.fullName,
    required this.telephone,
    required this.email,
    required this.kycValid,
    required this.niveauRisque,
    required this.niveauCompte,
    required this.communeLabel,
    required this.dateInscription,
    required this.profession,
    required this.adresse,
    required this.identites,
    required this.scoreClient,
  });

  final int id;
  final String fullName;
  final String telephone;
  final String? email;
  final bool kycValid;
  final String niveauRisque;
  final String niveauCompte;
  final String communeLabel;
  final String? dateInscription;
  final String profession;
  final String adresse;
  final List<IdentiteItem> identites;
  final double? scoreClient;

  factory ClientProfile.fromJson(Map<String, dynamic> json, {double? scoreClient}) {
    final user = json['utilisateur'] as Map<String, dynamic>? ?? {};
    final identites = (json['identites'] as List<dynamic>? ?? [])
        .map((e) => IdentiteItem.fromJson(e as Map<String, dynamic>))
        .toList();

    return ClientProfile(
      id: json['id'] as int,
      fullName: user['full_name'] as String? ?? '',
      telephone: user['telephone'] as String? ?? '',
      email: user['email'] as String?,
      kycValid: json['kyc_valid'] == true,
      niveauRisque: json['niveau_risque'] as String? ?? 'moyen',
      niveauCompte: json['niveau_compte'] as String? ?? 'standard',
      communeLabel: json['commune_label'] as String? ?? '',
      dateInscription: json['date_inscription'] as String?,
      profession: json['profession'] as String? ?? '',
      adresse: json['adresse'] as String? ?? '',
      identites: identites,
      scoreClient: scoreClient,
    );
  }
}

class IdentiteItem {
  IdentiteItem({
    required this.id,
    required this.typePiece,
    required this.statutVerification,
    required this.isExpired,
  });

  final int id;
  final String typePiece;
  final String statutVerification;
  final bool isExpired;

  factory IdentiteItem.fromJson(Map<String, dynamic> json) {
    return IdentiteItem(
      id: json['id'] as int,
      typePiece: json['type_piece'] as String? ?? '',
      statutVerification: json['statut_verification'] as String? ?? 'en_attente',
      isExpired: json['is_expired'] == true,
    );
  }

  bool get isVerified => statutVerification == 'verifie';
}
