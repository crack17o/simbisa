class ClientScoreData {
  ClientScoreData({
    required this.scoreClient,
    required this.niveauRisque,
    required this.detailDerniereDemande,
    required this.motors,
    required this.shapFeatures,
    required this.probabiliteDefaut,
    required this.modeleUtilise,
    required this.analyseDate,
  });

  final double scoreClient;
  final String? niveauRisque;
  final ScoreDemandeDetail? detailDerniereDemande;
  final List<ScoreMotorData> motors;
  final List<ShapFeatureData> shapFeatures;
  final double? probabiliteDefaut;
  final String? modeleUtilise;
  final String? analyseDate;

  factory ClientScoreData.fromJson(Map<String, dynamic> json) {
    final detailJson = json['detail_derniere_demande'] as Map<String, dynamic>?;
    final detail = detailJson != null ? ScoreDemandeDetail.fromJson(detailJson) : null;

    final motors = <ScoreMotorData>[];
    void addMotor(String key, String name, int colorIndex) {
      final block = detailJson?[key] as Map<String, dynamic>?;
      if (block == null) return;
      final score = double.tryParse(block['score']?.toString() ?? '') ?? 0;
      motors.add(ScoreMotorData(name: name, score: score.round(), weight: 25, colorIndex: colorIndex));
    }

    addMotor('score_regles', 'Règles', 0);
    addMotor('score_comportemental', 'Comportemental', 1);
    addMotor('score_mobile_money', 'Mobile Money', 2);

    final ia = detailJson?['score_ia'] as Map<String, dynamic>?;
    if (ia != null) {
      final scoreIa = double.tryParse(ia['score_normalise']?.toString() ?? '') ?? 0;
      motors.add(ScoreMotorData(
        name: 'IA XGBoost',
        score: scoreIa.round(),
        weight: 25,
        colorIndex: 3,
        details: [
          ScoreDetailData('Proba. défaut', '${(double.tryParse(ia['probabilite_defaut']?.toString() ?? '') ?? 0).toStringAsFixed(1)}%'),
          ScoreDetailData('Niveau risque', ia['niveau_risque']?.toString() ?? '—'),
          ScoreDetailData('Modèle', ia['modele_utilise']?.toString() ?? '—'),
        ],
      ));
    }

    final shap = <ShapFeatureData>[];
    final shapRaw = ia?['shap_values'];
    if (shapRaw is Map) {
      shapRaw.forEach((key, value) {
        final v = double.tryParse(value?.toString() ?? '') ?? 0;
        shap.add(ShapFeatureData(name: key.toString(), shap: v, value: v >= 0 ? '+' : ''));
      });
      shap.sort((a, b) => b.shap.abs().compareTo(a.shap.abs()));
    }

    return ClientScoreData(
      scoreClient: (json['score_client'] as num?)?.toDouble() ?? 0,
      niveauRisque: detail?.niveauRisque ?? ia?['niveau_risque'] as String?,
      detailDerniereDemande: detail,
      motors: motors,
      shapFeatures: shap,
      probabiliteDefaut: ia != null
          ? double.tryParse(ia['probabilite_defaut']?.toString() ?? '')
          : null,
      modeleUtilise: ia?['modele_utilise'] as String?,
      analyseDate: detail?.dateDecision,
    );
  }
}

class ScoreDemandeDetail {
  ScoreDemandeDetail({
    required this.demandeId,
    required this.decision,
    required this.motif,
    required this.explicationIa,
    required this.scoreGlobal,
    required this.niveauRisque,
    required this.dateDecision,
  });

  final int demandeId;
  final String? decision;
  final String? motif;
  final String? explicationIa;
  final double? scoreGlobal;
  final String? niveauRisque;
  final String? dateDecision;

  factory ScoreDemandeDetail.fromJson(Map<String, dynamic> json) {
    final decisionBlock = json['decision'] as Map<String, dynamic>?;
    final ia = json['score_ia'] as Map<String, dynamic>?;
    return ScoreDemandeDetail(
      demandeId: json['demande_id'] as int? ?? 0,
      decision: decisionBlock?['decision'] as String?,
      motif: decisionBlock?['motif'] as String?,
      explicationIa: decisionBlock?['explication_ia'] as String?,
      scoreGlobal: decisionBlock != null
          ? double.tryParse(decisionBlock['score_global']?.toString() ?? '')
          : null,
      niveauRisque: ia?['niveau_risque'] as String?,
      dateDecision: decisionBlock?['date_decision'] as String?,
    );
  }
}

class ScoreMotorData {
  ScoreMotorData({
    required this.name,
    required this.score,
    required this.weight,
    required this.colorIndex,
    this.details = const [],
  });

  final String name;
  final int score;
  final int weight;
  final int colorIndex;
  final List<ScoreDetailData> details;
}

class ScoreDetailData {
  const ScoreDetailData(this.label, this.value);
  final String label;
  final String value;
}

class ShapFeatureData {
  ShapFeatureData({required this.name, required this.shap, required this.value});
  final String name;
  final double shap;
  final String value;
}
