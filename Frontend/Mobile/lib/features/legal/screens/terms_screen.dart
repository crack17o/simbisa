import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const sections = [
      _LegalSection('1. Présentation du service',
          'Simbisa est une plateforme de micro-crédit numérique opérée par Rawbank S.A., banque commerciale agréée par la Banque Centrale du Congo. Elle permet d\'accéder à des micro-crédits, à l\'épargne virtuelle et à la gestion de portefeuille Mobile Money.'),
      _LegalSection('2. Conditions d\'accès',
          'Pour utiliser Simbisa, vous devez :\n• Être résident de Kinshasa\n• Avoir entre 20 et 60 ans\n• Disposer d\'un numéro de téléphone DRC (+243) valide\n• Fournir des informations exactes lors de l\'inscription\n\nSimbisa peut suspendre tout compte dont les informations sont inexactes.'),
      _LegalSection('3. Services de crédit',
          'Les crédits sont soumis à une évaluation automatique par scoring (règles bancaires, Mobile Money, comportement, IA XGBoost). L\'octroi n\'est jamais garanti.\n\nPlafonds par niveau :\n• Standard : \$300 / 6 mois\n• Pro : \$700 / 9 mois\n• Pro+ : \$1 200 / 12 mois\n• Premium : \$2 500 / 12 mois\n\nTaux d\'intérêt : 1,75% à 3,5%/mois selon score et niveau.'),
      _LegalSection('4. Obligations du client',
          'En utilisant Simbisa, vous vous engagez à :\n• Rembourser les crédits aux dates prévues\n• Maintenir un solde suffisant pour les remboursements\n• Signaler immédiatement tout accès suspect\n• Ne pas utiliser la plateforme à des fins illégales\n\nTout défaut > 30 jours entraîne transmission au recouvrement et inscription au SIC de la BCC.'),
      _LegalSection('5. Wallet et épargne',
          'Les fonds dans votre wallet Simbisa sont conservés dans un compte ségrégué chez Rawbank S.A. et protégés par les dispositions légales sur les dépôts bancaires en RDC.\n\nLes comptes d\'épargne sont des produits virtuels liés à votre wallet. Ils n\'ont pas d\'intérêts mais améliorent votre score comportemental.'),
      _LegalSection('6. Mobile Money',
          'Simbisa intègre les services Mobile Money des opérateurs DRC (Vodacom M-Pesa, Orange Money, Airtel Money, Africell). L\'opérateur est détecté automatiquement depuis votre numéro. Simbisa n\'est pas responsable des interruptions des réseaux tiers.'),
      _LegalSection('7. Responsabilité',
          'Simbisa ne peut être tenue responsable des pertes résultant d\'un accès non autorisé dû à une négligence de l\'utilisateur (mot de passe partagé, appareil non sécurisé), des interruptions pour maintenance, ou des décisions basées sur des informations inexactes.\n\nService client : support@simbisa.cd — délai de réponse garanti 48h.'),
      _LegalSection('8. Droit applicable',
          'Les présentes conditions sont régies par le droit de la RDC. Tout litige sera soumis aux tribunaux de commerce de Kinshasa après tentative de règlement amiable. Langue de référence : le français.'),
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
            child: const Icon(Icons.article_outlined, size: 16, color: SimbisaColors.noir),
          ),
          const SizedBox(width: 10),
          const Text("Conditions d'utilisation",
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
              'En créant un compte Simbisa, vous acceptez sans réserve les présentes conditions. Veuillez les lire attentivement.',
              style: TextStyle(color: SimbisaColors.muted, fontSize: 13, height: 1.5),
            ),
          ),
          const SizedBox(height: 16),
          for (final s in sections) _LegalCard(section: s),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              '© 2025 Simbisa Rawbank · Kinshasa, RDC · support@simbisa.cd',
              style: TextStyle(color: SimbisaColors.muted, fontSize: 11),
              textAlign: TextAlign.center,
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
