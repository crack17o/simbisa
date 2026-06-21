// ─── Models ──────────────────────────────────────────────────────────────────

class UserModel {
  final String id;
  final String name;
  final String phone;
  final String role;
  final bool kycValid;
  final int score;
  final String riskLevel;

  const UserModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.kycValid,
    required this.score,
    required this.riskLevel,
  });
}

class CreditModel {
  final String id;
  final double montant;
  final int duree;
  final String statut;
  final String date;
  final double? mensualite;
  final String? motif;

  const CreditModel({
    required this.id,
    required this.montant,
    required this.duree,
    required this.statut,
    required this.date,
    this.mensualite,
    this.motif,
  });
}

class SavingsModel {
  final double balance;
  final double goal;
  final String goalLabel;
  final int streakDays;
  final double bonusFidelite;
  final List<SavingsPoint> history;

  const SavingsModel({
    required this.balance,
    required this.goal,
    required this.goalLabel,
    required this.streakDays,
    required this.bonusFidelite,
    required this.history,
  });

  double get percent => (balance / goal).clamp(0.0, 1.0);
}

class SavingsPoint {
  final String mois;
  final double solde;
  const SavingsPoint(this.mois, this.solde);
}

class ScoreMotor {
  final String name;
  final int score;
  final int weight;
  final List<ScoreDetail> details;
  final int colorIndex;

  const ScoreMotor({
    required this.name,
    required this.score,
    required this.weight,
    required this.details,
    required this.colorIndex,
  });
}

class ScoreDetail {
  final String label;
  final String value;
  const ScoreDetail(this.label, this.value);
}

class ShapFeature {
  final String name;
  final double shap;
  final String value;
  const ShapFeature(this.name, this.shap, this.value);
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

class MockData {
  static const user = UserModel(
    id: '#C-00847',
    name: 'Kiala Mavinga',
    phone: '+243 800 000 001',
    role: 'client',
    kycValid: true,
    score: 74,
    riskLevel: 'Faible',
  );

  static const credits = [
    CreditModel(id: '#CR-001', montant: 200, duree: 3, statut: 'Remboursé', date: '12/02/2026', mensualite: 68.67, motif: 'Achat de stock commercial'),
    CreditModel(id: '#CR-002', montant: 150, duree: 2, statut: 'Remboursé', date: '05/04/2026', mensualite: 77.25, motif: 'Frais de scolarité'),
    CreditModel(id: '#CR-003', montant: 250, duree: 3, statut: 'En cours', date: '01/06/2026', mensualite: 85.83, motif: 'Achat de stock commercial'),
  ];

  static const savings = SavingsModel(
    balance: 175,
    goal: 300,
    goalLabel: 'Achat stock commercial',
    streakDays: 47,
    bonusFidelite: 8.75,
    history: [
      SavingsPoint('Jan', 40),
      SavingsPoint('Fév', 70),
      SavingsPoint('Mar', 95),
      SavingsPoint('Avr', 130),
      SavingsPoint('Mai', 115),
      SavingsPoint('Jun', 175),
    ],
  );

  static const scoreMotors = [
    ScoreMotor(
      name: 'Règles',
      score: 85,
      weight: 25,
      colorIndex: 0,
      details: [
        ScoreDetail('KYC validé', '✓'),
        ScoreDetail('Âge', '28 ans'),
        ScoreDetail('Arriérés actifs', 'Aucun'),
      ],
    ),
    ScoreMotor(
      name: 'Comportemental',
      score: 78,
      weight: 25,
      colorIndex: 1,
      details: [
        ScoreDetail('Objectif épargne atteint', '78%'),
        ScoreDetail('Crédits remboursés', '2/2'),
        ScoreDetail('Activité plateforme', 'Élevée'),
      ],
    ),
    ScoreMotor(
      name: 'Mobile Money',
      score: 72,
      weight: 25,
      colorIndex: 2,
      details: [
        ScoreDetail('Flux entrants moy.', '\$340/mois'),
        ScoreDetail('Régularité revenus', '87%'),
        ScoreDetail('Solde moyen mensuel', '\$120'),
      ],
    ),
    ScoreMotor(
      name: 'IA XGBoost',
      score: 62,
      weight: 25,
      colorIndex: 3,
      details: [
        ScoreDetail('Proba. défaut', '12.4%'),
        ScoreDetail('Niveau risque', 'Faible'),
        ScoreDetail('Modèle version', 'v2.3.1'),
      ],
    ),
  ];

  static const shapFeatures = [
    ShapFeature('Régularité flux entrants', 0.18, '87%'),
    ShapFeature('Objectif épargne atteint', 0.14, '78%'),
    ShapFeature('Solde moyen mensuel', 0.11, '\$120'),
    ShapFeature('Nb. crédits remboursés', 0.10, '2'),
    ShapFeature('Ancienneté plateforme', 0.07, '8 mois'),
    ShapFeature('Volatilité flux sortants', -0.06, '18%'),
    ShapFeature('Montant max transaction', 0.05, '\$200'),
  ];
}
