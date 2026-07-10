import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
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
  PlatformFile? _kycFile;
  bool _showReplaceForm = false;

  // MFA
  final _mfaCodeCtrl = TextEditingController();
  bool _mfaLoading = false;
  String _mfaSentTo = '';
  bool _mfaEnabled = false;
  bool _mfaDisableOpen = false;
  final _mfaDisablePwdCtrl = TextEditingController();

  // Change password
  final _oldPwdCtrl = TextEditingController();
  final _newPwdCtrl = TextEditingController();
  final _newPwd2Ctrl = TextEditingController();
  bool _changingPwd = false;
  bool _showOldPwd = false;
  bool _showNewPwd = false;
  bool _showNewPwd2 = false;

  @override
  void initState() {
    super.initState();
    _mfaEnabled = Session.current?.mfaEnabled ?? false;
    _oldPwdCtrl.addListener(() => setState(() {}));
    _newPwdCtrl.addListener(() => setState(() {}));
    _load();
  }

  void _handleMfaToggle() {
    if (_mfaEnabled) {
      setState(() => _mfaDisableOpen = !_mfaDisableOpen);
      if (!_mfaDisableOpen) _mfaDisablePwdCtrl.clear();
    } else if (_mfaSentTo.isNotEmpty) {
      setState(() { _mfaSentTo = ''; _mfaCodeCtrl.clear(); });
    } else {
      _sendMfaCode();
    }
  }

  @override
  void dispose() {
    _professionCtrl.dispose();
    _adresseCtrl.dispose();
    _dateNaissanceCtrl.dispose();
    _kycNumeroCtrl.dispose();
    _kycExpirationCtrl.dispose();
    _mfaCodeCtrl.dispose();
    _mfaDisablePwdCtrl.dispose();
    _oldPwdCtrl.dispose();
    _newPwdCtrl.dispose();
    _newPwd2Ctrl.dispose();
    super.dispose();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Color _adaptive(Color dark, Color light) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;

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
    final rawDate = _dateNaissanceCtrl.text.trim();
    final isoDate = rawDate.isNotEmpty ? displayDateToIso(rawDate) : null;
    if (rawDate.isNotEmpty && isoDate == null) {
      showToastError(context, 'Date invalide — format attendu : JJ/MM/AAAA');
      setState(() => _savingProfile = false);
      return;
    }
    try {
      await _clientService.updateProfile(
        profession: _professionCtrl.text.trim(),
        adresse: _adresseCtrl.text.trim(),
        dateNaissance: isoDate,
      );
      if (mounted) showToast(context, 'Profil enregistré.');
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _pickKycFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
      withData: true,
    );
    if (result != null && result.files.isNotEmpty) {
      setState(() => _kycFile = result.files.first);
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
    final rawExpiry = _kycExpirationCtrl.text.trim();
    final isoExpiry = displayDateToIso(rawExpiry);
    if (isoExpiry == null) {
      showToastError(context, 'Date invalide — format attendu : JJ/MM/AAAA');
      return;
    }
    setState(() => _submittingKyc = true);
    try {
      await _clientService.submitKyc(
        typePiece: _kycTypeMap[_kycType] ?? _kycType,
        numeroPiece: _kycNumeroCtrl.text.trim(),
        dateExpiration: isoExpiry,
        fileBytes: _kycFile?.bytes,
        fileName: _kycFile?.name,
      );
      if (mounted) {
        showToast(context, 'KYC soumis — vérification par un agent sous 48h.');
        _kycNumeroCtrl.clear();
        _kycExpirationCtrl.clear();
        setState(() { _kycFile = null; _showReplaceForm = false; });
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

  Future<void> _disableMfa() async {
    if (_mfaDisablePwdCtrl.text.isEmpty) {
      showToastError(context, 'Mot de passe requis.');
      return;
    }
    setState(() => _mfaLoading = true);
    try {
      await _auth.mfaDisable(_mfaDisablePwdCtrl.text);
      if (mounted) {
        setState(() {
          _mfaEnabled = false;
          _mfaDisableOpen = false;
          _mfaSentTo = '';
        });
        _mfaDisablePwdCtrl.clear();
        showToast(context, 'MFA désactivé.');
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

  Future<void> _openKycDoc(String url) async {
    try {
      final Uint8List bytes = await _clientService.fetchKycDocument(url);
      if (!mounted) return;
      final lower = url.toLowerCase();
      final isImage = lower.contains('.jpg') || lower.contains('.jpeg') || lower.contains('.png');
      if (isImage) {
        showDialog(
          context: context,
          builder: (_) => Dialog(
            backgroundColor: SimbisaColors.noir.withValues(alpha: 0.95),
            insetPadding: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.memory(bytes, fit: BoxFit.contain),
                ),
                Positioned(
                  top: 8, right: 8,
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                      child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        showToast(context, 'Document PDF — visualisation disponible uniquement via navigateur.');
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Impossible d\'afficher le document.');
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
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_hasError || _profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mon profil & KYC')),
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
      appBar: AppBar(
        title: const Text('Mon profil & KYC'),
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
          Text(profile.fullName, style: const TextStyle(fontFamily: 'Sora', fontSize: 20, fontWeight: FontWeight.w700)),
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
    final hasPendingId = profile.identites.any((i) => i.statutVerification == 'en_attente');
    // (label, isOk, isPending, subtitle)
    final items = [
      (
        'Identité vérifiée',
        identiteOk,
        !identiteOk && hasPendingId,
        identiteOk
            ? 'Document validé'
            : (hasPendingId ? 'En cours de vérification par un agent (48h)' : 'Soumettez une pièce d\'identité'),
      ),
      ('Téléphone', true, false, profile.telephone),
      ('KYC global', profile.kycValid, false, profile.kycValid ? 'Profil validé' : 'Validation en cours'),
      ('E-mail', profile.email != null && profile.email!.isNotEmpty, false, profile.email ?? 'Non renseigné'),
    ];

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Statut KYC', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: (item.$2
                              ? SimbisaColors.success
                              : item.$3
                                  ? SimbisaColors.or
                                  : SimbisaColors.muted)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item.$2
                          ? Icons.check_circle_rounded
                          : item.$3
                              ? Icons.hourglass_top_rounded
                              : Icons.radio_button_unchecked_rounded,
                      color: item.$2
                          ? SimbisaColors.success
                          : item.$3
                              ? SimbisaColors.or
                              : SimbisaColors.muted,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.$1,
                            style: SimbisaText.body(13,
                                weight: FontWeight.w600,
                                color: item.$2
                                    ? SimbisaColors.blanc
                                    : item.$3
                                        ? SimbisaColors.or
                                        : SimbisaColors.muted)),
                        Text(item.$4, style: SimbisaText.body(11, color: SimbisaColors.muted)),
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
    final existingId = profile.identites.isNotEmpty ? profile.identites.last : null;
    final showForm = existingId == null || _showReplaceForm;

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Agent de crédit assigné
          if (profile.agentAssigne != null) ...[
            Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: SimbisaColors.teal.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.person_pin_rounded, color: SimbisaColors.teal, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Agent de crédit', style: SimbisaText.label(color: SimbisaColors.muted)),
                      const SizedBox(height: 2),
                      Text(profile.agentAssigne!.fullName,
                          style: SimbisaText.body(13, weight: FontWeight.w600)),
                      Text(profile.agentAssigne!.telephone,
                          style: SimbisaText.body(11, color: SimbisaColors.muted)),
                    ],
                  ),
                ),
              ],
            ),
            Divider(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black).withValues(alpha: 0.12), height: 24),
          ],

          // Titre section
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: SimbisaColors.or.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.badge_rounded, color: SimbisaColors.or, size: 18),
              ),
              const SizedBox(width: 12),
              Text(
                showForm && _showReplaceForm ? 'Remplacer le document KYC' : 'Document KYC',
                style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (!showForm) ...[
            // Carte du document existant
            NeuInset(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        existingId.isVerified
                            ? Icons.check_circle_rounded
                            : Icons.hourglass_top_rounded,
                        color: existingId.isVerified ? SimbisaColors.success : SimbisaColors.or,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          [
                            existingId.typePiece.replaceAll('_', ' '),
                            if (existingId.numeroPiece != null) '· ${existingId.numeroPiece}',
                          ].join(' '),
                          style: SimbisaText.body(13, weight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (existingId.dateExpiration != null) ...[
                    const SizedBox(height: 4),
                    Text('Expire : ${existingId.dateExpiration}',
                        style: SimbisaText.body(11, color: SimbisaColors.muted)),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _KycActionButton(
                          icon: Icons.visibility_outlined,
                          label: 'Voir la pièce',
                          color: existingId.documentScan != null
                              ? SimbisaColors.or
                              : SimbisaColors.muted,
                          onTap: existingId.documentScan != null
                              ? () => _openKycDoc(existingId.documentScan!)
                              : () => showToast(context,
                                    'Aucun document joint — soumettez à nouveau en joignant votre pièce.'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _KycActionButton(
                          icon: Icons.refresh_rounded,
                          label: 'Remplacer',
                          color: SimbisaColors.muted,
                          onTap: () => setState(() => _showReplaceForm = true),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ] else ...[
            // Avertissement si on remplace une pièce existante
            if (_showReplaceForm)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: NeuInset(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: SimbisaColors.or, size: 14),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'La nouvelle pièce remplacera l\'ancienne après validation par un agent.',
                          style: SimbisaText.body(11, color: SimbisaColors.or),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Formulaire KYC
            Text('Type de pièce', style: SimbisaText.body(12, color: SimbisaColors.muted)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: _adaptive(SimbisaColors.panel, SimbisaLightColors.panel),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black).withValues(alpha: 0.08)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _kycType,
                  dropdownColor: _adaptive(SimbisaColors.panel, SimbisaLightColors.panel),
                  items: _kycTypes
                      .map((t) => DropdownMenuItem(value: t, child: Text(t, style: SimbisaText.body(13))))
                      .toList(),
                  onChanged: (v) => setState(() => _kycType = v ?? _kycType),
                ),
              ),
            ),
            const SizedBox(height: 12),
            NeuTextField(
              label: 'Numéro de pièce',
              hint: 'Ex : 123456789',
              prefixIcon: const Icon(Icons.numbers_rounded),
              controller: _kycNumeroCtrl,
            ),
            const SizedBox(height: 12),
            NeuTextField(
              label: 'Date d\'expiration',
              hint: 'JJ/MM/AAAA',
              prefixIcon: const Icon(Icons.calendar_today_outlined),
              controller: _kycExpirationCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [DateInputFormatter()],
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _pickKycFile,
              child: NeuInset(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                child: Row(
                  children: [
                    Icon(
                      _kycFile != null ? Icons.check_circle_rounded : Icons.upload_file_rounded,
                      size: 20,
                      color: _kycFile != null ? SimbisaColors.success : SimbisaColors.or,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _kycFile != null ? _kycFile!.name : 'Joindre un document',
                            style: SimbisaText.body(13,
                                color: _kycFile != null ? SimbisaColors.success : null),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text('PNG, JPG ou PDF — recommandé',
                              style: SimbisaText.body(11, color: SimbisaColors.muted)),
                        ],
                      ),
                    ),
                    if (_kycFile != null)
                      GestureDetector(
                        onTap: () => setState(() => _kycFile = null),
                        child: const Icon(Icons.close_rounded, size: 16, color: SimbisaColors.muted),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_showReplaceForm)
              Row(
                children: [
                  Expanded(
                    child: NeuButton(
                      gold: false,
                      secondary: true,
                      onTap: () => setState(() { _showReplaceForm = false; _kycFile = null; }),
                      child: const Text('Annuler'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: NeuButton(
                      width: double.infinity,
                      loading: _submittingKyc,
                      onTap: _submitKyc,
                      child: const Text('Remplacer la pièce'),
                    ),
                  ),
                ],
              )
            else
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
          const Text('Modifier le profil', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          NeuTextField(label: 'Profession', hint: 'Ex : Commerçant', prefixIcon: const Icon(Icons.work_outline), controller: _professionCtrl),
          const SizedBox(height: 12),
          NeuTextField(label: 'Adresse', hint: 'Ex : Av. Université, Kinshasa', prefixIcon: const Icon(Icons.location_on_outlined), controller: _adresseCtrl),
          const SizedBox(height: 12),
          NeuTextField(
            label: 'Date de naissance',
            hint: 'JJ/MM/AAAA',
            prefixIcon: const Icon(Icons.cake_outlined),
            controller: _dateNaissanceCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [DateInputFormatter()],
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
          const Text('Informations personnelles', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
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
              Expanded(child: Text(serviceTitle, style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700))),
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
    final setupOpen = !_mfaEnabled && _mfaSentTo.isNotEmpty;
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Sécurité MFA', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      _mfaEnabled
                          ? 'OTP requis à chaque connexion.'
                          : 'Activez pour sécuriser votre compte.',
                      style: SimbisaText.body(12, color: SimbisaColors.muted),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: _mfaLoading ? null : _handleMfaToggle,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  width: 44, height: 24,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: _mfaEnabled
                        ? SimbisaColors.success
                        : SimbisaColors.muted.withValues(alpha: 0.3),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 250),
                    alignment: _mfaEnabled ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.all(3),
                      width: 18, height: 18,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          ),

          // ── Panneau activation (OTP envoyé) ──
          if (setupOpen) ...[
            const SizedBox(height: 14),
            Text('Code envoyé à $_mfaSentTo', style: SimbisaText.body(12, color: SimbisaColors.muted)),
            const SizedBox(height: 10),
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
                Expanded(
                  child: NeuButton(
                    gold: false,
                    secondary: true,
                    onTap: () => setState(() { _mfaSentTo = ''; _mfaCodeCtrl.clear(); }),
                    child: const Text('Annuler'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: NeuButton(loading: _mfaLoading, onTap: _verifyMfa, child: const Text('Confirmer')),
                ),
              ],
            ),
          ],

          // ── Panneau désactivation ──
          if (_mfaEnabled && _mfaDisableOpen) ...[
            const SizedBox(height: 14),
            Text('Confirmez votre mot de passe pour désactiver le MFA.', style: SimbisaText.body(12, color: SimbisaColors.muted)),
            const SizedBox(height: 10),
            NeuTextField(
              label: 'Mot de passe',
              hint: '••••••••',
              prefixIcon: const Icon(Icons.lock_outline),
              controller: _mfaDisablePwdCtrl,
              obscureText: true,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: NeuButton(
                    gold: false,
                    secondary: true,
                    onTap: () { setState(() => _mfaDisableOpen = false); _mfaDisablePwdCtrl.clear(); },
                    child: const Text('Annuler'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: NeuButton(loading: _mfaLoading, onTap: _disableMfa, child: const Text('Confirmer')),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChangePasswordCard() {
    Widget eyeBtn(bool show, VoidCallback toggle) => IconButton(
      icon: Icon(show ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: SimbisaColors.muted, size: 18),
      onPressed: toggle,
    );

    final oldFilled = _oldPwdCtrl.text.isNotEmpty;

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Changer le mot de passe', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          NeuTextField(
            label: 'Mot de passe actuel',
            hint: '••••••••',
            prefixIcon: const Icon(Icons.lock_outline),
            controller: _oldPwdCtrl,
            obscureText: !_showOldPwd,
            suffixIcon: eyeBtn(_showOldPwd, () => setState(() => _showOldPwd = !_showOldPwd)),
          ),
          // Les champs nouveau mdp ne s'affichent que quand le champ actuel est rempli
          if (oldFilled) ...[
            const SizedBox(height: 12),
            NeuTextField(
              label: 'Nouveau mot de passe',
              hint: '••••••••',
              prefixIcon: const Icon(Icons.lock_outline),
              controller: _newPwdCtrl,
              obscureText: !_showNewPwd,
              suffixIcon: eyeBtn(_showNewPwd, () => setState(() => _showNewPwd = !_showNewPwd)),
            ),
            _PwdStrength(password: _newPwdCtrl.text),
            const SizedBox(height: 12),
            NeuTextField(
              label: 'Confirmer le nouveau mot de passe',
              hint: '••••••••',
              prefixIcon: const Icon(Icons.lock_outline),
              controller: _newPwd2Ctrl,
              obscureText: !_showNewPwd2,
              suffixIcon: eyeBtn(_showNewPwd2, () => setState(() => _showNewPwd2 = !_showNewPwd2)),
            ),
            const SizedBox(height: 16),
            NeuButton(
              width: double.infinity,
              loading: _changingPwd,
              onTap: _changePassword,
              child: const Text('Mettre à jour'),
            ),
          ],
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
                  fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),

          // Toggle thème
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _adaptive(SimbisaColors.surface, SimbisaLightColors.surface),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.07)),
            ),
            child: Row(children: [
              Icon(isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                  size: 16, color: SimbisaColors.or),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isDark ? Tr.of(lang, 'ui.theme.dark') : Tr.of(lang, 'ui.theme.light'),
                  style: SimbisaText.body(13),
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
                          : _adaptive(SimbisaColors.surface, SimbisaLightColors.surface),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected
                            ? SimbisaColors.or.withValues(alpha: 0.5)
                            : (isDark ? Colors.white : Colors.black).withValues(alpha: 0.06),
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
          const Text('Compte', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? SimbisaColors.surface : SimbisaLightColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.07)),
        ),
        child: Row(children: [
          Icon(icon, size: 16, color: SimbisaColors.or),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: SimbisaText.body(13))),
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

class _KycActionButton extends StatelessWidget {
  const _KycActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(label, style: SimbisaText.body(12, color: color, weight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ─── Password strength indicator ─────────────────────────────────────────────
bool _pwdLen8(String p)     => p.length >= 8;
bool _pwdUpper(String p)    => p.contains(RegExp(r'[A-Z]'));
bool _pwdDigit(String p)    => p.contains(RegExp(r'[0-9]'));
bool _pwdSpecial(String p)  => p.contains(RegExp(r'[^A-Za-z0-9]'));

const _pwdChecks = [
  ('8 car. min', _pwdLen8),
  ('Majuscule',  _pwdUpper),
  ('Chiffre',    _pwdDigit),
  ('Spécial',    _pwdSpecial),
];
const _pwdColors  = [Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFEAB308), Color(0xFF22C55E)];
const _pwdLabels  = ['Faible', 'Passable', 'Bon', 'Fort'];

class _PwdStrength extends StatelessWidget {
  final String password;
  const _PwdStrength({required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();
    final results = _pwdChecks.map((c) => c.$2(password)).toList();
    final score   = results.where((ok) => ok).length;
    final color   = _pwdColors[score > 0 ? score - 1 : 0];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: List.generate(4, (i) => Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
              height: 4,
              decoration: BoxDecoration(
                color: i < score ? color : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          )),
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (score > 0)
              Text(_pwdLabels[score - 1], style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600))
            else
              const SizedBox.shrink(),
            const Spacer(),
            Flexible(
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: 8.0,
                runSpacing: 2.0,
                children: List.generate(_pwdChecks.length, (i) => Text(
                  '${results[i] ? '✓' : '·'} ${_pwdChecks[i].$1}',
                  style: TextStyle(fontSize: 10, color: results[i] ? const Color(0xFF22C55E) : SimbisaColors.muted),
                )),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
