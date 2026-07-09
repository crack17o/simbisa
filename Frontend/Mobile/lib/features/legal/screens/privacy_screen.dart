import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const sections = [
      _LegalSection('1. Collecte des données',
          'Simbisa Rawbank collecte uniquement les données nécessaires à ses services : informations d\'identité (nom, prénom, pièce d\'identité), coordonnées (téléphone, email), données financières (revenus estimés, historique Mobile Money) et données de navigation.\n\nCes données sont collectées lors de votre inscription et de vos interactions avec l\'application.'),
      _LegalSection('2. Utilisation des données',
          'Vos données sont utilisées exclusivement pour :\n• Évaluer votre éligibilité au crédit via notre scoring à 4 moteurs\n• Assurer la sécurité de votre compte (détection de fraude, MFA)\n• Gérer vos dossiers de crédit et d\'épargne\n• Respecter nos obligations légales en RDC\n• Améliorer nos modèles de scoring de manière anonymisée'),
      _LegalSection('3. Partage des données',
          'Nous ne vendons jamais vos données. Elles peuvent être partagées avec :\n• Rawbank S.A. (réglementation bancaire congolaise)\n• Les opérateurs Mobile Money pour la vérification des transactions, avec votre consentement\n• Les autorités réglementaires (BCC, FIC) sur réquisition légale'),
      _LegalSection('4. Sécurité',
          'Toutes vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). L\'accès est contrôlé par rôle. Chaque action sensible est journalisée. Les mots de passe sont hachés avec bcrypt.'),
      _LegalSection('5. Conservation',
          'Conformément à la réglementation bancaire congolaise :\n• Données client : 10 ans après clôture\n• Données de scoring : 5 ans\n• Journaux d\'audit : 7 ans\n\nÀ expiration, vos données sont anonymisées ou supprimées de manière sécurisée.'),
      _LegalSection('6. Vos droits',
          'Vous disposez des droits d\'accès, rectification, oubli, portabilité et opposition sur vos données personnelles.\n\nPour les exercer : privacy@simbisa.cd'),
      _LegalSection('7. Modifications',
          'Cette politique peut être mise à jour. Vous serez notifié 30 jours avant toute modification substantielle. La version en vigueur est toujours accessible depuis l\'application.'),
    ];

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [SimbisaColors.or, Color(0xFFB8960C)],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.shield_outlined, size: 16, color: SimbisaColors.noir),
          ),
          const SizedBox(width: 10),
          const Text('Confidentialité',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ]),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08)),
            ),
            child: const Text(
              'Simbisa Rawbank s\'engage à protéger vos données personnelles conformément aux lois en vigueur en RDC.',
              style: TextStyle(color: SimbisaColors.muted, fontSize: 13, height: 1.5),
            ),
          ),
          const SizedBox(height: 16),
          for (final s in sections) _LegalCard(section: s),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              '© 2025 Simbisa Rawbank · Kinshasa, RDC',
              style: TextStyle(color: SimbisaColors.muted, fontSize: 11),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _LegalSection {
  const _LegalSection(this.title, this.body);
  final String title;
  final String body;
}

class _LegalCard extends StatelessWidget {
  const _LegalCard({required this.section});
  final _LegalSection section;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(section.title,
            style: const TextStyle(color: SimbisaColors.or, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(section.body,
            style: const TextStyle(color: SimbisaColors.muted, fontSize: 13, height: 1.6)),
      ]),
    );
  }
}
