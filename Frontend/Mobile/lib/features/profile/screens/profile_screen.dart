import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/i18n/translations.dart';
import 'package:simbisa/core/providers/lang_provider.dart';
import 'package:simbisa/core/providers/theme_provider.dart';
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
import 'package:simbisa/core/utils/toast.dart';

const _kycTypes = [
  'Carte nationale d\'identité',
  'Passeport',
  'Permis de conduire',
  'Carte de réfugié',
];
const _kycTypeMap = {
  'Carte nationale d\'identité': 'cni',
  'Passeport': 'passeport',
  'Permis de conduire': 'permis',
  'Carte de réfugié': 'refugie',
};

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _clientService = ClientService();
  final _scoringService = ScoringService();
  final _walletService = WalletService();
  final _auth = AuthService();

  // Load
  bool _loading = true;
  bool _hasError = false;
  ClientProfile? _profile;
  List<MobileMoneyAccount> _mmAccounts = [];
  int _score = 0;

  // Edit profil
  final _professionCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();
  final _dateNaissanceCtrl = TextEditingController();
  bool _savingProfile = false;

  // KYC
  String _kycType = _kycTypes.first;
  final _kycNumeroCtrl = TextEditingController();
  final _kycExpirationCtrl = TextEditingController();
  bool _submittingKyc = false;

  // MFA
  final _mfaCodeCtrl = TextEditingController();
  bool _mfaLoading = false;
  String _mfaSentTo = '';
  bool _mfaEnabled = false;

  // Change password
  final _oldPwdCtrl = TextEditingController();
  final _newPwdCtrl = TextEditingController();
  final _newPwd2Ctrl = TextEditingController();
  bool _changingPwd = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _professionCtrl.dispose();
    _adresseCtrl.dispose();
    _dateNaissanceCtrl.dispose();
    _kycNumeroCtrl.dispose();
    _kycExpirationCtrl.dispose();
    _mfaCodeCtrl.dispose();
    _oldPwdCtrl.dispose();
    _newPwdCtrl.dispose();
    _newPwd2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _hasError = false;
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
        _professionCtrl.text = profile.profession;
        _adresseCtrl.text = profile.adresse;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      showToastError(context, e.message);
      setState(() {
        _hasError = true;
        _loading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      await _clientService.updateProfile(
        profession: _professionCtrl.text.trim(),
        adresse: _adresseCtrl.text.trim(),
        dateNaissance: _dateNaissanceCtrl.text.isNotEmpty ? _dateNaissanceCtrl.text : null,
      );
      if (mounted) showToast(context, 'Profil enregistré.');
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _submitKyc() async {
    if (_kycNumeroCtrl.text.isEmpty) {
      showToastError(context, 'Numéro de pièce requis.');
      return;
    }
    if (_kycExpirationCtrl.text.isEmpty) {
      showToastError(context, 'Date d\'expiration requise.');
      return;
    }
    setState(() => _submittingKyc = true);
    try {
      await _clientService.submitKyc(
        typePiece: _kycTypeMap[_kycType] ?? _kycType,
        numeroPiece: _kycNumeroCtrl.text.trim(),
        dateExpiration: _kycExpirationCtrl.text.trim(),
      );
      if (mounted) {
        showToast(context, 'KYC soumis — vérification par un agent sous 48h.');
        _kycNumeroCtrl.clear();
        _kycExpirationCtrl.clear();
        _load();
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _submittingKyc = false);
    }
  }

  Future<void> _sendMfaCode() async {
    setState(() => _mfaLoading = true);
    try {
      final sentTo = await _auth.mfaSetup();
      if (mounted) {
        setState(() => _mfaSentTo = sentTo);
        showToast(context, 'Code envoyé à $sentTo');
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _mfaLoading = false);
    }
  }

  Future<void> _verifyMfa() async {
    if (_mfaCodeCtrl.text.length != 6) {
      showToastError(context, 'Code à 6 chiffres requis.');
      return;
    }
    setState(() => _mfaLoading = true);
    try {
      await _auth.mfaVerify(_mfaCodeCtrl.text.trim());
      if (mounted) {
        setState(() => _mfaEnabled = true);
        _mfaCodeCtrl.clear();
        showToast(context, 'MFA activé.');
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _mfaLoading = false);
    }
  }

  Future<void> _changePassword() async {
    if (_newPwdCtrl.text.length < 8) {
      showToastError(context, 'Minimum 8 caractères.');
      return;
    }
    if (_newPwdCtrl.text != _newPwd2Ctrl.text) {
      showToastError(context, 'Les mots de passe ne correspondent pas.');
      return;
    }
    setState(() => _changingPwd = true);
    try {
      await _auth.changePassword(
        oldPassword: _oldPwdCtrl.text,
        newPassword: _newPwdCtrl.text,
      );
      if (mounted) {
        _oldPwdCtrl.clear();
        _newPwdCtrl.clear();
        _newPwd2Ctrl.clear();
        showToast(context, 'Mot de passe mis à jour.');
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _changingPwd = false);
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

    if (_hasError || _profile == null) {
      return Scaffold(
        backgroundColor: SimbisaColors.surface,
        appBar: AppBar(title: const Text('Mon profil & KYC'), backgroundColor: SimbisaColors.panel),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('Impossible de charger le profil.', style: SimbisaText.body(14, color: SimbisaColors.danger)),
            const SizedBox(height: 16),
            NeuButton(onTap: _load, child: const Text('Réessayer')),
          ]),
        ),
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
              _buildKycUpload(profile),
              const SizedBox(height: 20),
              _buildEditProfile(),
              const SizedBox(height: 20),
              _buildInfoCard(profile),
              const SizedBox(height: 20),
              _buildMobileMoneyCard(profile),
              const SizedBox(height: 20),
              _buildMfaCard(),
              const SizedBox(height: 20),
              _buildChangePasswordCard(),
              const SizedBox(height: 20),
              _buildLegalCard(),
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
              child: Text(initials.isNotEmpty ? initials : 'S',
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 28, fontWeight: FontWeight.w700, color: SimbisaColors.noir)),
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
      ('Téléphone', true, profile.telephone),
      ('KYC global', profile.kycValid, profile.kycValid ? 'Profil validé' : 'Validation en cours'),
      ('E-mail', profile.email != null && profile.email!.isNotEmpty, profile.email ?? 'Non renseigné'),
    ];

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Statut KYC', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: (item.$2 ? SimbisaColors.success : SimbisaColors.muted).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item.$2 ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                      color: item.$2 ? SimbisaColors.success : SimbisaColors.muted,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.$1, style: SimbisaText.body(13, weight: FontWeight.w600, color: item.$2 ? SimbisaColors.blanc : SimbisaColors.muted)),
                        Text(item.$3, style: SimbisaText.body(11, color: SimbisaColors.muted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildKycUpload(ClientProfile profile) {
    final alreadyVerified = profile.identites.any((i) => i.isVerified && !i.isExpired);
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.or.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.badge_rounded, color: SimbisaColors.or, size: 18),
              ),
              const SizedBox(width: 12),
              const Text('Soumettre un document KYC', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
            ],
          ),
          const SizedBox(height: 12),
          if (alreadyVerified)
            NeuInset(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: SimbisaColors.success, size: 16),
                  const SizedBox(width: 8),
                  Text('Identité déjà vérifiée.', style: SimbisaText.body(13, color: SimbisaColors.success)),
                ],
              ),
            )
          else ...[
            Text('Type de pièce', style: SimbisaText.body(12, color: SimbisaColors.muted)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: SimbisaColors.panel,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _kycType,
                  dropdownColor: SimbisaColors.panel,
                  items: _kycTypes.map((t) => DropdownMenuItem(value: t, child: Text(t, style: SimbisaText.body(13)))).toList(),
                  onChanged: (v) => setState(() => _kycType = v ?? _kycType),
                ),
              ),
            ),
            const SizedBox(height: 12),
            NeuTextField(label: 'Numéro de pièce', hint: 'Ex : 123456789', prefixIcon: const Icon(Icons.numbers_rounded), controller: _kycNumeroCtrl),
            const SizedBox(height: 12),
            NeuTextField(
              label: 'Date d\'expiration',
              hint: 'AAAA-MM-JJ',
              prefixIcon: const Icon(Icons.calendar_today_outlined),
              controller: _kycExpirationCtrl,
              keyboardType: TextInputType.datetime,
            ),
            const SizedBox(height: 16),
            NeuButton(
              width: double.infinity,
              loading: _submittingKyc,
              onTap: _submitKyc,
              child: const Text('Soumettre le KYC'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEditProfile() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Modifier le profil', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 16),
          NeuTextField(label: 'Profession', hint: 'Ex : Commerçant', prefixIcon: const Icon(Icons.work_outline), controller: _professionCtrl),
          const SizedBox(height: 12),
          NeuTextField(label: 'Adresse', hint: 'Ex : Av. Université, Kinshasa', prefixIcon: const Icon(Icons.location_on_outlined), controller: _adresseCtrl),
          const SizedBox(height: 12),
          NeuTextField(
            label: 'Date de naissance',
            hint: 'AAAA-MM-JJ',
            prefixIcon: const Icon(Icons.cake_outlined),
            controller: _dateNaissanceCtrl,
            keyboardType: TextInputType.datetime,
          ),
          const SizedBox(height: 16),
          NeuButton(width: double.infinity, loading: _savingProfile, onTap: _saveProfile, child: const Text('Enregistrer')),
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
          for (final item in [
            (Icons.person_outline, 'Nom complet', profile.fullName),
            (Icons.phone_outlined, 'Téléphone', profile.telephone),
            (Icons.calendar_today_outlined, 'Inscription', formatDate(profile.dateInscription)),
            (Icons.location_on_outlined, 'Commune', profile.communeLabel.isNotEmpty ? profile.communeLabel : 'Kinshasa'),
            (Icons.work_outline, 'Profession', profile.profession.isNotEmpty ? profile.profession : '—'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Icon(item.$1, size: 16, color: SimbisaColors.muted),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.$2, style: SimbisaText.label()),
                        const SizedBox(height: 2),
                        Text(item.$3, style: SimbisaText.body(13, weight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMobileMoneyCard(ClientProfile profile) {
    final mm = _mmAccounts.isNotEmpty ? _mmAccounts.first : null;
    final operator = Session.current?.mobileMoneyOperator ?? MobileMoneyOperator.fromPhone(profile.telephone);
    final serviceTitle = operator != null ? '${operator.serviceName} · ${operator.label}' : 'Mobile Money RDC';

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.teal.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.mobile_friendly_rounded, color: SimbisaColors.teal, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(serviceTitle, style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc))),
            ],
          ),
          const SizedBox(height: 8),
          Text('Ce numéro est analysé pour le scoring Mobile Money.', style: SimbisaText.body(11, color: SimbisaColors.muted)),
          const SizedBox(height: 16),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _MmRow('Numéro analysé', profile.telephone),
                const SizedBox(height: 8),
                _MmRow('Réseau', operator?.label ?? 'Non identifié'),
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

  Widget _buildMfaCard() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Sécurité MFA', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (_mfaEnabled ? SimbisaColors.success : SimbisaColors.muted).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(_mfaEnabled ? 'Activé' : 'Inactif', style: SimbisaText.body(11, color: _mfaEnabled ? SimbisaColors.success : SimbisaColors.muted, weight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Chaque connexion enverra un code OTP à votre e-mail.', style: SimbisaText.body(12, color: SimbisaColors.muted)),
          const SizedBox(height: 14),
          if (_mfaEnabled)
            Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: SimbisaColors.success, size: 16),
                const SizedBox(width: 8),
                Text('MFA activé — OTP requis à chaque connexion.', style: SimbisaText.body(13, color: SimbisaColors.success)),
              ],
            )
          else ...[
            if (_mfaSentTo.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text('Code envoyé à $_mfaSentTo', style: SimbisaText.body(12, color: SimbisaColors.muted)),
              ),
            NeuTextField(
              label: 'Code reçu par e-mail',
              hint: '000000',
              prefixIcon: const Icon(Icons.shield_outlined),
              controller: _mfaCodeCtrl,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: NeuButton(gold: false, secondary: true, loading: _mfaLoading, onTap: _sendMfaCode, child: const Text('Envoyer le code'))),
                const SizedBox(width: 10),
                Expanded(child: NeuButton(loading: _mfaLoading, onTap: _verifyMfa, child: const Text('Activer MFA'))),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChangePasswordCard() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Changer le mot de passe', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 16),
          NeuTextField(label: 'Mot de passe actuel', hint: '••••••••', prefixIcon: const Icon(Icons.lock_outline), controller: _oldPwdCtrl, obscureText: true),
          const SizedBox(height: 12),
          NeuTextField(label: 'Nouveau mot de passe', hint: '••••••••', prefixIcon: const Icon(Icons.lock_outline), controller: _newPwdCtrl, obscureText: true),
          const SizedBox(height: 12),
          NeuTextField(label: 'Confirmer', hint: '••••••••', prefixIcon: const Icon(Icons.lock_outline), controller: _newPwd2Ctrl, obscureText: true),
          const SizedBox(height: 16),
          NeuButton(width: double.infinity, loading: _changingPwd, onTap: _changePassword, child: const Text('Mettre à jour le mot de passe')),
        ],
      ),
    );
  }

  Widget _buildLegalCard() {
    final isDark = ref.watch(themeProvider) == ThemeMode.dark;
    final lang = ref.watch(langProvider);

    const langs = [
      ('fr', '🇫🇷', 'Français'),
      ('en', '🇬🇧', 'English'),
      ('ln', '🇨🇩', 'Lingala'),
    ];

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(Tr.of(lang, 'profile.appearance'),
              style: const TextStyle(
                  fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),

          // Toggle thème
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: SimbisaColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            ),
            child: Row(children: [
              Icon(isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                  size: 16, color: SimbisaColors.or),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isDark ? Tr.of(lang, 'ui.theme.dark') : Tr.of(lang, 'ui.theme.light'),
                  style: SimbisaText.body(13, color: SimbisaColors.blanc),
                ),
              ),
              GestureDetector(
                onTap: () => ref.read(themeProvider.notifier).toggle(),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  width: 44,
                  height: 24,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: isDark ? SimbisaColors.or : SimbisaColors.muted.withValues(alpha: 0.3),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 250),
                    alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.all(3),
                      width: 18,
                      height: 18,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 12),

          // Sélecteur de langue
          Text(Tr.of(lang, 'lang.label'),
              style: SimbisaText.label(color: SimbisaColors.muted)),
          const SizedBox(height: 8),
          Row(
            children: langs.map((entry) {
              final (code, flag, label) = entry;
              final selected = code == lang;
              return Expanded(
                child: GestureDetector(
                  onTap: () => ref.read(langProvider.notifier).setLang(code),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: selected
                          ? SimbisaColors.or.withValues(alpha: 0.12)
                          : SimbisaColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected
                            ? SimbisaColors.or.withValues(alpha: 0.5)
                            : Colors.white.withValues(alpha: 0.06),
                        width: selected ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(flag, style: const TextStyle(fontSize: 18)),
                        const SizedBox(height: 4),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                            color: selected ? SimbisaColors.or : SimbisaColors.muted,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),

          _LegalRow(
            icon: Icons.help_outline_rounded,
            label: Tr.of(lang, 'profile.help'),
            onTap: () => context.push(AppRoutes.help),
          ),
          const SizedBox(height: 8),
          _LegalRow(
            icon: Icons.shield_outlined,
            label: Tr.of(lang, 'ui.privacy'),
            onTap: () => context.push(AppRoutes.privacy),
          ),
          const SizedBox(height: 8),
          _LegalRow(
            icon: Icons.article_outlined,
            label: Tr.of(lang, 'ui.terms'),
            onTap: () => context.push(AppRoutes.terms),
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

class _LegalRow extends StatelessWidget {
  const _LegalRow({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: SimbisaColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
        ),
        child: Row(children: [
          Icon(icon, size: 16, color: SimbisaColors.or),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: SimbisaText.body(13, color: SimbisaColors.blanc))),
          const Icon(Icons.arrow_forward_ios, size: 13, color: SimbisaColors.muted),
        ]),
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
