import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/mobile_money_operator.dart';
import 'package:simbisa/core/utils/toast.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _prenomCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  final _pwd2Ctrl = TextEditingController();
  final _auth = AuthService();

  bool _loading = false;
  bool _loadingCommunes = true;
  String? _selectedCommune;
  String? _mmHint;
  List<CommuneOption> _communes = [];

  void _updateMmHint() {
    final raw = _phoneCtrl.text.trim();
    if (raw.isEmpty) {
      setState(() => _mmHint = null);
      return;
    }
    try {
      final normalized = AuthService.normalizePhone(raw);
      final op = MobileMoneyOperator.fromPhone(normalized);
      setState(() => _mmHint = op != null
          ? 'Mobile Money : ${op.label} · ${op.serviceName}'
          : 'Préfixe non reconnu — vérifiez le numéro RDC');
    } catch (_) {
      setState(() => _mmHint = null);
    }
  }

  @override
  void initState() {
    super.initState();
    _loadCommunes();
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

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _prenomCtrl.dispose();
    _nomCtrl.dispose();
    _pwdCtrl.dispose();
    _pwd2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_phoneCtrl.text.isEmpty || _prenomCtrl.text.isEmpty || _nomCtrl.text.isEmpty) {
      showToastError(context, 'Veuillez remplir tous les champs requis.');
      return;
    }
    if (_selectedCommune == null) {
      showToastError(context, 'Sélectionnez votre commune de résidence.');
      return;
    }
    if (_pwdCtrl.text.length < 8) {
      showToastError(context, 'Mot de passe minimum : 8 caractères.');
      return;
    }
    if (_pwdCtrl.text != _pwd2Ctrl.text) {
      showToastError(context, 'Les mots de passe ne correspondent pas.');
      return;
    }

    final email = _emailCtrl.text.trim();
    if (email.isNotEmpty && !email.contains('@')) {
      showToastError(context, 'Adresse e-mail invalide.');
      return;
    }

    setState(() => _loading = true);

    try {
      final result = await _auth.register(
        telephone: _phoneCtrl.text.trim(),
        nom: _nomCtrl.text.trim(),
        prenom: _prenomCtrl.text.trim(),
        password: _pwdCtrl.text,
        communeKinshasa: _selectedCommune!,
        email: email.isEmpty ? null : email,
      );
      if (!mounted) return;
      if (result.welcomeEmailSent) {
        showToastSuccess(context, 'Compte créé. E-mail de bienvenue envoyé à $email.');
      }
      if (result.agentAssigne != null) {
        showToast(context, 'Agent assigné : ${result.agentAssigne!.fullName} · ${result.agentAssigne!.telephone}');
      }
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
    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(title: const Text('Créer un compte')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: NeuCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Inscription', style: SimbisaText.display(22)),
                const SizedBox(height: 6),
                Text('Rôle Client · Simbisa Rawbank', style: SimbisaText.body(13, color: SimbisaColors.muted)),
                const SizedBox(height: 20),

                NeuTextField(
                  label: 'Téléphone (+243)',
                  hint: '+243 8XX XXX XXX',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  onChanged: (_) => _updateMmHint(),
                ),
                if (_mmHint != null) ...[
                  const SizedBox(height: 6),
                  Text(_mmHint!, style: SimbisaText.body(11, color: SimbisaColors.teal)),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: NeuTextField(
                        label: 'Prénom',
                        hint: 'Ex : Kiala',
                        prefixIcon: const Icon(Icons.person_outline),
                        controller: _prenomCtrl,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: NeuTextField(
                        label: 'Nom',
                        hint: 'Ex : Mavinga',
                        controller: _nomCtrl,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                NeuTextField(
                  label: 'E-mail (optionnel)',
                  hint: 'exemple@mail.com',
                  prefixIcon: const Icon(Icons.email_outlined),
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 6),
                Text(
                  'Si renseigné, un e-mail de bienvenue vous sera envoyé.',
                  style: SimbisaText.body(11, color: SimbisaColors.muted),
                ),
                const SizedBox(height: 16),
                Text('Commune de résidence', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                const SizedBox(height: 8),
                _loadingCommunes
                    ? const Center(child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ))
                    : Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: SimbisaColors.panel,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: _selectedCommune,
                            dropdownColor: SimbisaColors.panel,
                            items: _communes
                                .map((c) => DropdownMenuItem(
                                      value: c.code,
                                      child: Text(c.label, style: SimbisaText.body(14)),
                                    ))
                                .toList(),
                            onChanged: (v) => setState(() => _selectedCommune = v),
                          ),
                        ),
                      ),
                const SizedBox(height: 16),
                NeuTextField(
                  label: 'Mot de passe',
                  hint: '••••••••',
                  prefixIcon: const Icon(Icons.lock_outline),
                  controller: _pwdCtrl,
                  obscureText: true,
                ),
                const SizedBox(height: 16),
                NeuTextField(
                  label: 'Confirmer',
                  hint: '••••••••',
                  prefixIcon: const Icon(Icons.lock_outline),
                  controller: _pwd2Ctrl,
                  obscureText: true,
                ),
                const SizedBox(height: 20),
                NeuButton(
                  width: double.infinity,
                  loading: _loading,
                  onTap: _register,
                  child: const Text('Créer mon compte'),
                ),
                const SizedBox(height: 14),
                Center(
                  child: GestureDetector(
                    onTap: () => context.go(AppRoutes.login),
                    child: Text('Déjà inscrit ? Se connecter', style: SimbisaText.body(12, color: SimbisaColors.or)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
