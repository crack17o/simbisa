import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/toast.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _phoneCtrl = TextEditingController();
  final _pwdCtrl   = TextEditingController();
  bool _showPwd  = false;
  bool _loading  = false;

  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _phoneCtrl.dispose();
    _pwdCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_phoneCtrl.text.isEmpty || _pwdCtrl.text.isEmpty) {
      showToastError(context, 'Veuillez remplir tous les champs.');
      return;
    }
    setState(() => _loading = true);
    try {
      await AuthService().login(
        telephone: _phoneCtrl.text.trim(),
        password: _pwdCtrl.text,
      );
      if (mounted) context.go(AppRoutes.dashboard);
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Connexion impossible. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 48),
                _buildLogo(),
                const SizedBox(height: 48),
                _buildHero(),
                const SizedBox(height: 40),
                _buildForm(),
                const SizedBox(height: 24),
                _buildDivider(),
                const SizedBox(height: 24),
                NeuButton(
                  gold: false,
                  secondary: true,
                  width: double.infinity,
                  onTap: () => context.go(AppRoutes.register),
                  child: const Text('Créer un compte Simbisa'),
                ),
                const SizedBox(height: 40),
                _buildStats(),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: SimbisaColors.panel,
            borderRadius: BorderRadius.circular(14),
            boxShadow: NeuShadow.goldGlow(),
          ),
          child: const Center(
            child: Text('S', style: TextStyle(fontFamily: 'Sora', fontSize: 20, fontWeight: FontWeight.w800, color: SimbisaColors.or)),
          ),
        ),
        const SizedBox(width: 12),
        GradientText(
          'Simbisa',
          style: const TextStyle(fontFamily: 'Sora', fontSize: 28, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }

  Widget _buildHero() {
    return Column(
      children: [
        const Text(
          "L'inclusion financière\ncommence ici.",
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Sora', fontSize: 26, fontWeight: FontWeight.w800, color: SimbisaColors.blanc, height: 1.25),
        ),
        const SizedBox(height: 12),
        Text(
          'Accédez au crédit grâce à votre historique Mobile Money.\nRapide, transparent, conçu pour la RDC.',
          textAlign: TextAlign.center,
          style: SimbisaText.body(13, color: SimbisaColors.muted),
        ),
      ],
    );
  }

  Widget _buildForm() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Connexion', style: TextStyle(fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 4),
          Text('Numéro illicocash + mot de passe', style: SimbisaText.body(13, color: SimbisaColors.muted)),
          const SizedBox(height: 24),

          NeuTextField(
            label: 'Numéro de téléphone',
            hint: '+243 8XX XXX XXX',
            prefixIcon: const Icon(Icons.phone_outlined),
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 16),
          NeuTextField(
            label: 'Mot de passe',
            hint: '••••••••',
            prefixIcon: const Icon(Icons.lock_outline),
            controller: _pwdCtrl,
            obscureText: !_showPwd,
            suffixIcon: IconButton(
              icon: Icon(_showPwd ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: SimbisaColors.muted, size: 18),
              onPressed: () => setState(() => _showPwd = !_showPwd),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: GestureDetector(
              child: Text('Mot de passe oublié ?', style: SimbisaText.body(12, color: SimbisaColors.or)),
            ),
          ),
          const SizedBox(height: 24),
          NeuButton(
            loading: _loading,
            width: double.infinity,
            onTap: _login,
            child: const Text('Se connecter'),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: Colors.white.withOpacity(0.08))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('ou', style: SimbisaText.body(12, color: SimbisaColors.muted)),
        ),
        Expanded(child: Container(height: 1, color: Colors.white.withOpacity(0.08))),
      ],
    );
  }

  Widget _buildStats() {
    final stats = [
      ('500k+', 'Clients actifs'),
      ('<3s', 'Décision crédit'),
      ('100%', 'Dématérialisé'),
    ];
    final List<Widget> children = [];
    for (var i = 0; i < stats.length; i++) {
      final s = stats[i];
      children.add(
        Expanded(
          child: NeuCard(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
            child: Column(
              children: [
                GradientText(
                  s.$1,
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(s.$2, textAlign: TextAlign.center, style: SimbisaText.body(10, color: SimbisaColors.muted)),
              ],
            ),
          ),
        ),
      );
      if (i != stats.length - 1) children.add(const SizedBox(width: 12));
    }
    return Row(children: children);
  }
}
