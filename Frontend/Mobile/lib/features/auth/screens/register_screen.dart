import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';
import 'package:simbisa/core/utils/mobile_money_operator.dart';
import 'package:simbisa/core/utils/toast.dart';

// ─── Règles de mot de passe ────────────────────────────────────────────────────
class _PwdRule {
  final String label;
  final bool Function(String) test;
  const _PwdRule(this.label, this.test);
}

const _pwdRules = [
  _PwdRule('8 car. min',  _len8),
  _PwdRule('Majuscule',   _hasUpper),
  _PwdRule('Chiffre',     _hasDigit),
  _PwdRule('Spécial',     _hasSpecial),
];

bool _len8(String p)    => p.length >= 8;
bool _hasUpper(String p) => p.contains(RegExp(r'[A-Z]'));
bool _hasDigit(String p) => p.contains(RegExp(r'[0-9]'));
bool _hasSpecial(String p) => p.contains(RegExp(r'[^A-Za-z0-9]'));

const _strengthColors = [Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFEAB308), Color(0xFF22C55E)];
const _strengthLabels = ['Faible', 'Passable', 'Bon', 'Fort'];

class _PasswordStrength extends StatelessWidget {
  final String password;
  const _PasswordStrength({required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final results = _pwdRules.map((r) => r.test(password)).toList();
    final score = results.where((ok) => ok).length;
    final color = _strengthColors[score > 0 ? score - 1 : 0];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: List.generate(4, (i) => Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
              height: 5,
              decoration: BoxDecoration(
                color: i < score ? color : (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          )),
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (score > 0)
              Text(_strengthLabels[score - 1], style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600))
            else
              const SizedBox.shrink(),
            const Spacer(),
            Flexible(
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: 8.0,
                runSpacing: 2.0,
                children: List.generate(_pwdRules.length, (i) => Text(
                  '${results[i] ? '✓' : '·'} ${_pwdRules[i].label}',
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

// ─── Écran d'inscription ───────────────────────────────────────────────────────
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Contrôleurs étape 1
  final _phoneCtrl      = TextEditingController();
  final _prenomCtrl     = TextEditingController();
  final _nomCtrl        = TextEditingController();
  final _postnomCtrl    = TextEditingController();
  final _emailCtrl      = TextEditingController();
  final _professionCtrl = TextEditingController();
  final _adresseCtrl    = TextEditingController();
  final _dateNaissCtrl  = TextEditingController();

  // Contrôleurs étape 2
  final _pwdCtrl  = TextEditingController();
  final _pwd2Ctrl = TextEditingController();

  final _auth = AuthService();

  int _step = 1;
  bool _loading = false;
  bool _loadingCommunes = true;
  bool _accepted = false;
  String? _selectedCommune;
  String? _mmHint;
  List<CommuneOption> _communes = [];

  @override
  void initState() {
    super.initState();
    _loadCommunes();
    _pwdCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    for (final c in [
      _phoneCtrl, _prenomCtrl, _nomCtrl, _postnomCtrl, _emailCtrl,
      _professionCtrl, _adresseCtrl, _dateNaissCtrl, _pwdCtrl, _pwd2Ctrl,
    ]) { c.dispose(); }
    super.dispose();
  }

  void _updateMmHint() {
    final raw = _phoneCtrl.text.trim();
    if (raw.isEmpty) { setState(() => _mmHint = null); return; }
    try {
      final normalized = AuthService.normalizePhone(raw);
      final op = MobileMoneyOperator.fromPhone(normalized);
      setState(() => _mmHint = op != null
          ? '${op.serviceName} · ${op.label}'
          : 'Préfixe non reconnu — vérifiez le numéro RDC');
    } catch (_) { setState(() => _mmHint = null); }
  }

  Future<void> _loadCommunes() async {
    try {
      final list = await _auth.fetchCommunes();
      if (!mounted) return;
      setState(() {
        _communes = list;
        _selectedCommune = list.isNotEmpty ? list.first.code : null;
        _loadingCommunes = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingCommunes = false);
      showToastError(context, 'Impossible de charger les communes.');
    }
  }

  void _goToStep2() {
    if (_phoneCtrl.text.isEmpty) { showToastError(context, 'Numéro de téléphone requis.'); return; }
    if (_prenomCtrl.text.isEmpty) { showToastError(context, 'Prénom requis.'); return; }
    if (_nomCtrl.text.isEmpty) { showToastError(context, 'Nom requis.'); return; }
    if (_selectedCommune == null) { showToastError(context, 'Sélectionnez votre commune.'); return; }
    setState(() => _step = 2);
  }

  Future<void> _register() async {
    if (_pwdCtrl.text.length < 8) { showToastError(context, 'Mot de passe minimum : 8 caractères.'); return; }
    if (_pwdCtrl.text != _pwd2Ctrl.text) { showToastError(context, 'Les mots de passe ne correspondent pas.'); return; }
    if (!_accepted) { showToastError(context, "Acceptez la politique de confidentialité et les CGU."); return; }

    final email = _emailCtrl.text.trim();
    if (email.isNotEmpty && !email.contains('@')) { showToastError(context, 'Adresse e-mail invalide.'); return; }

    final rawDate = _dateNaissCtrl.text.trim();
    final isoDate = rawDate.isNotEmpty ? displayDateToIso(rawDate) : null;
    if (rawDate.isNotEmpty && isoDate == null) {
      showToastError(context, 'Date de naissance invalide (JJ/MM/AAAA).');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await _auth.register(
        telephone: _phoneCtrl.text.trim(),
        nom: _nomCtrl.text.trim(),
        postnom: _postnomCtrl.text.trim(),
        prenom: _prenomCtrl.text.trim(),
        password: _pwdCtrl.text,
        communeKinshasa: _selectedCommune!,
        email: email.isEmpty ? null : email,
        adresse: _adresseCtrl.text.trim(),
        profession: _professionCtrl.text.trim(),
        dateNaissance: isoDate,
      );
      if (!mounted) return;
      if (result.welcomeEmailSent) showToastSuccess(context, 'Bienvenue ! E-mail de confirmation envoyé.');
      if (result.agentAssigne != null) showToast(context, 'Agent : ${result.agentAssigne!.fullName}');
      context.go(AppRoutes.dashboard);
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Inscription impossible. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mutedColor = isDark ? SimbisaColors.muted : SimbisaLightColors.muted;
    final orColor    = isDark ? SimbisaColors.or    : SimbisaLightColors.or;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Créer un compte'),
        leading: _step == 2
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step = 1),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: NeuCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── En-tête + indicateur ─────────────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Inscription', style: SimbisaText.display(22)),
                    Text('Étape $_step / 2', style: SimbisaText.body(12, color: mutedColor)),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: List.generate(2, (i) => Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: i == 0 ? 4 : 0),
                      height: 4,
                      decoration: BoxDecoration(
                        color: i < _step ? orColor : (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  )),
                ),
                const SizedBox(height: 20),

                if (_step == 1) ..._buildStep1(orColor, mutedColor),
                if (_step == 2) ..._buildStep2(orColor, mutedColor),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Étape 1 : Identité ──────────────────────────────────────────────────────
  List<Widget> _buildStep1(Color orColor, Color mutedColor) => [
    NeuTextField(
      label: 'Téléphone',
      hint: '8XX XXX XXX',
      prefix: const Text('🇨🇩 +243 ', style: TextStyle(fontSize: 13, color: SimbisaColors.muted, fontWeight: FontWeight.w600)),
      controller: _phoneCtrl,
      keyboardType: TextInputType.phone,
      onChanged: (_) => _updateMmHint(),
    ),
    if (_mmHint != null) ...[
      const SizedBox(height: 6),
      Text(_mmHint!, style: SimbisaText.body(11, color: SimbisaColors.teal)),
    ],
    const SizedBox(height: 14),
    Row(
      children: [
        Expanded(child: NeuTextField(label: 'Prénom', hint: 'Ex : Kiala', prefixIcon: const Icon(Icons.person_outline), controller: _prenomCtrl)),
        const SizedBox(width: 12),
        Expanded(child: NeuTextField(label: 'Nom', hint: 'Ex : Mavinga', controller: _nomCtrl)),
      ],
    ),
    const SizedBox(height: 14),
    NeuTextField(label: 'Post-nom (optionnel)', hint: 'Ex : Tshimba', controller: _postnomCtrl),
    const SizedBox(height: 14),
    NeuTextField(
      label: 'E-mail (recommandé)',
      hint: 'exemple@mail.com',
      prefixIcon: const Icon(Icons.email_outlined),
      controller: _emailCtrl,
      keyboardType: TextInputType.emailAddress,
    ),
    const SizedBox(height: 6),
    Text('Requis pour le MFA et les notifications.', style: SimbisaText.body(11, color: mutedColor)),
    const SizedBox(height: 14),
    Text('Commune de résidence', style: SimbisaText.body(12, color: mutedColor)),
    const SizedBox(height: 8),
    _buildCommuneDropdown(mutedColor),
    const SizedBox(height: 14),
    NeuTextField(
      label: 'Profession (optionnel)',
      hint: 'Ex : Commerçant(e)',
      prefixIcon: const Icon(Icons.work_outline),
      controller: _professionCtrl,
    ),
    const SizedBox(height: 14),
    NeuTextField(
      label: 'Adresse (optionnel)',
      hint: 'Ex : Av. Université, Gombe',
      prefixIcon: const Icon(Icons.location_on_outlined),
      controller: _adresseCtrl,
    ),
    const SizedBox(height: 14),
    NeuTextField(
      label: 'Date de naissance (optionnel)',
      hint: 'JJ/MM/AAAA',
      prefixIcon: const Icon(Icons.cake_outlined),
      controller: _dateNaissCtrl,
      keyboardType: TextInputType.number,
      inputFormatters: [DateInputFormatter()],
    ),
    const SizedBox(height: 20),
    NeuButton(
      width: double.infinity,
      onTap: _goToStep2,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Continuer'),
          const SizedBox(width: 8),
          const Icon(Icons.arrow_forward_rounded, size: 18, color: SimbisaColors.noir),
        ],
      ),
    ),
    const SizedBox(height: 14),
    Center(
      child: GestureDetector(
        onTap: () => context.go(AppRoutes.login),
        child: Text('Déjà inscrit ? Se connecter', style: SimbisaText.body(12, color: orColor)),
      ),
    ),
  ];

  Widget _buildCommuneDropdown(Color mutedColor) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final panelColor = isDark ? SimbisaColors.panel : SimbisaLightColors.panel;
    final textColor  = isDark ? SimbisaColors.blanc  : SimbisaLightColors.blanc;

    if (_loadingCommunes) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(12),
        child: CircularProgressIndicator(strokeWidth: 2, color: SimbisaColors.or),
      ));
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: panelColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: _selectedCommune,
          dropdownColor: panelColor,
          items: _communes.map((c) => DropdownMenuItem(
            value: c.code,
            child: Text(c.label, style: SimbisaText.body(14, color: textColor)),
          )).toList(),
          onChanged: (v) => setState(() => _selectedCommune = v),
        ),
      ),
    );
  }

  // ── Étape 2 : Sécurité ──────────────────────────────────────────────────────
  List<Widget> _buildStep2(Color orColor, Color mutedColor) => [
    NeuTextField(
      label: 'Mot de passe',
      hint: '••••••••',
      prefixIcon: const Icon(Icons.lock_outline),
      controller: _pwdCtrl,
      obscureText: true,
    ),
    _PasswordStrength(password: _pwdCtrl.text),
    const SizedBox(height: 14),
    NeuTextField(
      label: 'Confirmer le mot de passe',
      hint: '••••••••',
      prefixIcon: const Icon(Icons.lock_outline),
      controller: _pwd2Ctrl,
      obscureText: true,
    ),
    const SizedBox(height: 20),
    Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: _accepted,
          onChanged: (v) => setState(() => _accepted = v ?? false),
          activeColor: orColor,
          checkColor: SimbisaColors.noir,
          side: BorderSide(color: mutedColor.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text.rich(
              TextSpan(
                style: SimbisaText.body(12, color: mutedColor),
                children: [
                  const TextSpan(text: "J'accepte la "),
                  TextSpan(
                    text: 'politique de confidentialité',
                    style: SimbisaText.body(12, color: orColor),
                    recognizer: TapGestureRecognizer()..onTap = () => context.push(AppRoutes.privacy),
                  ),
                  const TextSpan(text: ' et les '),
                  TextSpan(
                    text: "conditions d'utilisation",
                    style: SimbisaText.body(12, color: orColor),
                    recognizer: TapGestureRecognizer()..onTap = () => context.push(AppRoutes.terms),
                  ),
                  const TextSpan(text: ' de Simbisa.'),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
    const SizedBox(height: 20),
    NeuButton(
      width: double.infinity,
      loading: _loading,
      onTap: _accepted ? _register : null,
      child: const Text('Créer mon compte'),
    ),
  ];
}
