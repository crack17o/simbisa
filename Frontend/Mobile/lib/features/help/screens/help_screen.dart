import 'package:flutter/material.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/core/theme/app_theme.dart';

// ─── Données par rôle ────────────────────────────────────────────────────────

class _HelpSlide {
  const _HelpSlide({required this.emoji, required this.title, required this.items});
  final String emoji;
  final String title;
  final List<_FAQ> items;
}

class _FAQ {
  const _FAQ(this.q, this.a);
  final String q;
  final String a;
}

const _clientSlides = [
  _HelpSlide(
    emoji: '🪙',
    title: 'Wallet Mobile Money',
    items: [
      _FAQ('Comment déposer de l\'argent ?',
          'Dans "Wallets", appuyez sur votre wallet USD ou CDF, puis "Déposer". Entrez votre numéro Mobile Money — l\'opérateur est détecté automatiquement depuis votre préfixe (+243 081-085 → M-Pesa, 086-089 → Orange, 097-099 → Airtel, 090-091 → Africell).'),
      _FAQ('Pourquoi ai-je deux wallets ?',
          'Simbisa vous crée automatiquement un wallet USD et un wallet CDF. Utilisez chacun selon la devise de vos transactions ou de votre crédit.'),
      _FAQ('Comment retirer ?',
          'Appuyez sur "Retirer" dans votre wallet. Le montant doit être disponible. Les fonds arrivent sur votre numéro Mobile Money en quelques minutes.'),
    ],
  ),
  _HelpSlide(
    emoji: '🏦',
    title: 'Épargne',
    items: [
      _FAQ('Comment ouvrir un compte épargne ?',
          'Dans "Épargne", appuyez sur "Nouveau compte". Choisissez la devise, définissez un objectif de montant et une description.'),
      _FAQ('L\'épargne influence-t-elle mon score ?',
          'Oui. L\'épargne régulière et la progression vers vos objectifs comptent pour 25% de votre score de crédit.'),
      _FAQ('Peut-on retirer à tout moment ?',
          'Oui, sans blocage. Cependant, des retraits fréquents avant d\'atteindre vos objectifs peuvent réduire votre score comportemental.'),
    ],
  ),
  _HelpSlide(
    emoji: '💳',
    title: 'Crédit',
    items: [
      _FAQ('Quelles sont les conditions ?',
          'KYC validé, 20–60 ans, pas de crédit actif dans la même devise, montant dans votre plafond (Standard \$300 / Pro \$700 / Pro+ \$1 200 / Premium \$2 500).'),
      _FAQ('Comment est calculé le taux ?',
          'Score ≥75 → 2,5%/mois de base. Les niveaux Pro (-0,25%), Pro+ (-0,5%) et Premium (-0,75%) donnent une remise. Exemple : score 80 + Pro+ = 2,0%/mois.'),
      _FAQ('Combien de temps prend l\'évaluation ?',
          'Le scoring automatique dure quelques secondes. Si le score est entre 40 et 60, un agent valide manuellement (1–2 jours ouvrables).'),
    ],
  ),
  _HelpSlide(
    emoji: '📊',
    title: 'Score & IA',
    items: [
      _FAQ('Comment améliorer mon score ?',
          '4 leviers : (1) valider votre KYC, (2) avoir une activité Mobile Money régulière sur 90 jours, (3) épargner régulièrement et atteindre vos objectifs, (4) rembourser vos crédits sans défaut.'),
      _FAQ('Que signifient les "Explications IA" ?',
          'Cette section montre quels facteurs ont le plus influencé votre score (technologie SHAP), pour comprendre précisément comment l\'améliorer.'),
    ],
  ),
  _HelpSlide(
    emoji: '🔒',
    title: 'Sécurité',
    items: [
      _FAQ('Comment activer la double authentification ?',
          'Dans votre profil, activez la MFA par email. À chaque connexion depuis un nouvel appareil, un code OTP vous sera envoyé.'),
      _FAQ('J\'ai perdu l\'accès à mon compte ?',
          'Utilisez "Mot de passe oublié" sur la page de connexion. Un code OTP sera envoyé sur votre email ou téléphone.'),
    ],
  ),
];

const _agentSlides = [
  _HelpSlide(
    emoji: '👥',
    title: 'Gestion des clients',
    items: [
      _FAQ('Comment créer un client ?',
          'Dans "Clients de ma zone", appuyez sur "Nouveau client". Renseignez le téléphone, nom, prénom et date de naissance. Le client est affecté à votre commune automatiquement.'),
      _FAQ('Comment upgrader le niveau d\'un client ?',
          'Dans la fiche du client, section "Niveau de compte", vous pouvez passer de Standard à Pro, Pro+ ou Premium pour débloquer des plafonds de crédit supérieurs.'),
    ],
  ),
  _HelpSlide(
    emoji: '✅',
    title: 'Validation KYC',
    items: [
      _FAQ('Comment valider une pièce ?',
          'Dans la fiche client, section "KYC", consultez les documents scannés. Appuyez "Valider" si les informations correspondent. En cas de rejet, saisissez un motif précis.'),
      _FAQ('Quels types de pièces ?',
          'Carte nationale d\'identité congolaise, passeport (toutes nationalités), permis de conduire, carte de réfugié. La pièce ne doit pas être expirée.'),
    ],
  ),
  _HelpSlide(
    emoji: '📋',
    title: 'Traitement des dossiers',
    items: [
      _FAQ('Quand dois-je intervenir ?',
          'Lorsque le score global est entre 40 et 60 (zone grise) ou < 40 (alerte dangereuse), la demande est mise en attente de votre décision manuelle.'),
      _FAQ('Que contient le dossier de scoring ?',
          'Le dossier affiche le score global, la décomposition par moteur, la probabilité de défaut, les explications SHAP et l\'historique crédit du client.'),
    ],
  ),
];

const _otherSlides = [
  _HelpSlide(
    emoji: '📞',
    title: 'Assistance',
    items: [
      _FAQ('Comment contacter le support ?',
          'Email : support@simbisa.cd\nDélai de réponse garanti : 48h ouvrables.'),
      _FAQ('Assistance en agence ?',
          'Rendez-vous dans l\'agence Rawbank la plus proche de votre commune. Lundi–Vendredi, 8h–17h.'),
    ],
  ),
];

List<_HelpSlide> _slidesForRole(String? role) {
  switch (role) {
    case 'Agent':
      return [..._agentSlides, ..._otherSlides];
    default:
      return [..._clientSlides, ..._otherSlides];
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final role = Session.current?.roleName;
    final slides = _slidesForRole(role);

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text("Centre d'aide",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text('${_page + 1}/${slides.length}',
                style: const TextStyle(color: SimbisaColors.muted, fontSize: 13)),
          ),
        ],
      ),
      body: Column(children: [
        // ── Dots indicator ──
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(slides.length, (i) {
              final active = i == _page;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: active ? 20 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? SimbisaColors.or : SimbisaColors.muted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),
        ),

        // ── Slides ──
        Expanded(
          child: PageView.builder(
            controller: _controller,
            itemCount: slides.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (ctx, i) => _SlideView(slide: slides[i]),
          ),
        ),

        // ── Nav buttons ──
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Row(children: [
            if (_page > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _controller.previousPage(
                      duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: SimbisaColors.muted.withValues(alpha: 0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Précédent', style: TextStyle(color: SimbisaColors.muted)),
                ),
              ),
            if (_page > 0) const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: _page < slides.length - 1
                    ? () => _controller.nextPage(
                        duration: const Duration(milliseconds: 300), curve: Curves.easeInOut)
                    : () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: SimbisaColors.or,
                  foregroundColor: SimbisaColors.noir,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(_page < slides.length - 1 ? 'Suivant →' : 'Terminer',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _SlideView extends StatefulWidget {
  const _SlideView({required this.slide});
  final _HelpSlide slide;

  @override
  State<_SlideView> createState() => _SlideViewState();
}

class _SlideViewState extends State<_SlideView> {
  int? _openIndex;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        const SizedBox(height: 8),
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [SimbisaColors.or.withValues(alpha: 0.12), isDark ? SimbisaColors.panel : SimbisaLightColors.panel],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: SimbisaColors.or.withValues(alpha: 0.25)),
          ),
          child: Row(children: [
            Text(widget.slide.emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(width: 14),
            Text(widget.slide.title,
                style: TextStyle(
                    color: isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc, fontSize: 18, fontWeight: FontWeight.w700)),
          ]),
        ),
        const SizedBox(height: 14),
        // FAQ accordion
        ...List.generate(widget.slide.items.length, (i) {
          final faq = widget.slide.items[i];
          final open = _openIndex == i;
          return GestureDetector(
            onTap: () => setState(() => _openIndex = open ? null : i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: open
                    ? SimbisaColors.or.withValues(alpha: 0.06)
                    : (isDark ? SimbisaColors.panel : SimbisaLightColors.panel),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: open
                      ? SimbisaColors.or.withValues(alpha: 0.35)
                      : (isDark ? Colors.white : Colors.black).withValues(alpha: 0.07),
                ),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(faq.q,
                        style: TextStyle(
                            color: open ? SimbisaColors.or : (isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc),
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ),
                  Icon(open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                      color: open ? SimbisaColors.or : SimbisaColors.muted, size: 18),
                ]),
                if (open) ...[
                  const SizedBox(height: 10),
                  Text(faq.a,
                      style: const TextStyle(color: SimbisaColors.muted, fontSize: 13, height: 1.6)),
                ],
              ]),
            ),
          );
        }),
        const SizedBox(height: 8),
      ],
    );
  }
}
