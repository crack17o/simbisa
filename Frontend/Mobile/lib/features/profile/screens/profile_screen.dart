import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/models/client_profile.dart';
import 'package:simbisa/core/models/wallet_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/services/client_service.dart';
import 'package:simbisa/core/services/scoring_service.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/core/services/wallet_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';
import 'package:simbisa/core/utils/mobile_money_operator.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _clientService = ClientService();
  final _scoringService = ScoringService();
  final _walletService = WalletService();
  final _auth = AuthService();

  bool _loading = true;
  String? _error;
  ClientProfile? _profile;
  List<MobileMoneyAccount> _mmAccounts = [];
  int _score = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final scoreData = await _scoringService.fetchMyScore();
      final profile = await _clientService.fetchProfile(scoreClient: scoreData.scoreClient);
      final mm = await _walletService.fetchMobileMoneyAccounts();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _mmAccounts = mm;
        _score = scoreData.scoreClient.round();
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    await _auth.logout();
    if (!mounted) return;
    context.go(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: SimbisaColors.surface,
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_error != null || _profile == null) {
      return Scaffold(
        backgroundColor: SimbisaColors.surface,
        appBar: AppBar(title: const Text('Mon profil & KYC'), backgroundColor: SimbisaColors.panel),
        body: Center(child: Text(_error ?? 'Profil indisponible', style: SimbisaText.body(14, color: SimbisaColors.danger))),
      );
    }

    final profile = _profile!;

    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: const Text('Mon profil & KYC'),
        backgroundColor: SimbisaColors.panel,
        actions: [IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load)],
      ),
      body: RefreshIndicator(
        color: SimbisaColors.or,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildAvatar(profile),
              const SizedBox(height: 20),
              _buildKycStatus(profile),
              const SizedBox(height: 20),
              _buildInfoCard(profile),
              const SizedBox(height: 20),
              _buildMobileMoneyCard(profile),
              const SizedBox(height: 20),
              _buildDangerZone(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(ClientProfile profile) {
    final initials = profile.fullName
        .split(' ')
        .where((n) => n.isNotEmpty)
        .take(2)
        .map((n) => n[0])
        .join()
        .toUpperCase();

    return NeuCard(
      child: Column(
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              gradient: SimbisaColors.goldGradient,
              shape: BoxShape.circle,
              boxShadow: NeuShadow.goldGlow(),
            ),
            child: Center(
              child: Text(initials.isNotEmpty ? initials : 'S', style: const TextStyle(fontFamily: 'Sora', fontSize: 28, fontWeight: FontWeight.w700, color: SimbisaColors.noir)),
            ),
          ),
          const SizedBox(height: 14),
          Text(profile.fullName, style: const TextStyle(fontFamily: 'Sora', fontSize: 20, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 4),
          Text('Client Simbisa · ID #C-${profile.id.toString().padLeft(5, '0')}', style: SimbisaText.body(12, color: SimbisaColors.muted)),
          const SizedBox(height: 16),
          ScoreRing(score: _score, size: 80, label: 'Score'),
        ],
      ),
    );
  }

  Widget _buildKycStatus(ClientProfile profile) {
    final identiteOk = profile.identites.any((i) => i.isVerified && !i.isExpired);
    final items = [
      ('Identité vérifiée', identiteOk, identiteOk ? 'Document validé' : 'Soumettez une pièce d\'identité'),
      ('Numéro de téléphone', true, profile.telephone),
      ('KYC global', profile.kycValid, profile.kycValid ? 'Profil validé' : 'Validation en cours'),
      ('E-mail', profile.email != null && profile.email!.isNotEmpty, profile.email ?? 'Non renseigné'),
    ];

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Statut KYC', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          ...items.map((item) {
            final (label, done, sub) = item;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: (done ? SimbisaColors.success : SimbisaColors.muted).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                      color: done ? SimbisaColors.success : SimbisaColors.muted,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: SimbisaText.body(13, weight: FontWeight.w600, color: done ? SimbisaColors.blanc : SimbisaColors.muted)),
                        Text(sub, style: SimbisaText.body(11, color: SimbisaColors.muted)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildInfoCard(ClientProfile profile) {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Informations personnelles', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 16),
          ...[
            (Icons.person_outline, 'Nom complet', profile.fullName),
            (Icons.phone_outlined, 'Téléphone', profile.telephone),
            (Icons.calendar_today_outlined, 'Date d\'inscription', formatDate(profile.dateInscription)),
            (Icons.location_on_outlined, 'Commune', profile.communeLabel.isNotEmpty ? profile.communeLabel : 'Kinshasa'),
            (Icons.work_outline, 'Profession', profile.profession.isNotEmpty ? profile.profession : '—'),
          ].map((item) {
            final (icon, label, value) = item;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(icon, size: 16, color: SimbisaColors.muted),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: SimbisaText.label()),
                        const SizedBox(height: 2),
                        Text(value, style: SimbisaText.body(13, weight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildMobileMoneyCard(ClientProfile profile) {
    final mm = _mmAccounts.isNotEmpty ? _mmAccounts.first : null;
    final operator = Session.current?.mobileMoneyOperator ??
        MobileMoneyOperator.fromPhone(profile.telephone);
    final serviceTitle = operator != null
        ? '${operator.serviceName} · ${operator.label}'
        : 'Mobile Money RDC';

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.teal.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.mobile_friendly_rounded, color: SimbisaColors.teal, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(serviceTitle, style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Ce numéro inscrit est celui analysé pour le scoring Mobile Money.',
            style: SimbisaText.body(11, color: SimbisaColors.muted),
          ),
          const SizedBox(height: 16),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _MmRow('Numéro analysé', profile.telephone),
                const SizedBox(height: 8),
                _MmRow('Réseau détecté', operator?.label ?? 'Non identifié'),
                const SizedBox(height: 8),
                _MmRow('Service MM', operator?.serviceName ?? (mm?.operateur ?? '—')),
                const SizedBox(height: 8),
                _MmRow('Liaison API', mm != null && mm.isActive ? 'Compte lié ✓' : 'Déduit du numéro'),
                const SizedBox(height: 8),
                _MmRow('Devise', mm?.devise ?? 'USD'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDangerZone() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Compte', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          NeuButton(
            gold: false,
            secondary: true,
            width: double.infinity,
            onTap: _logout,
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.logout_rounded, size: 16, color: SimbisaColors.danger),
              const SizedBox(width: 8),
              Text('Se déconnecter', style: SimbisaText.body(14, color: SimbisaColors.danger, weight: FontWeight.w600)),
            ]),
          ),
        ],
      ),
    );
  }
}

class _MmRow extends StatelessWidget {
  final String label, value;
  const _MmRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: SimbisaText.body(12, color: SimbisaColors.muted)),
        Flexible(child: Text(value, style: SimbisaText.body(12, weight: FontWeight.w600), textAlign: TextAlign.end)),
      ],
    );
  }
}
