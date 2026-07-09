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
  final _otpCtrl  = TextEditingController();
  bool _showPwd   = false;
  bool _loading   = false;
  bool _needsOtp  = false;

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
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_phoneCtrl.text.isEmpty || _pwdCtrl.text.isEmpty) {
      showToastError(context, 'Veuillez remplir tous les champs.');
      return;
    }
    if (_needsOtp && _otpCtrl.text.length != 6) {
      showToastError(context, 'Code OTP à 6 chiffres requis.');
      return;
    }
    setState(() => _loading = true);
    try {
      await AuthService().login(
        telephone: _phoneCtrl.text.trim(),
        password: _pwdCtrl.text,
        otpCode: _needsOtp ? _otpCtrl.text.trim() : null,
      );
      if (mounted) context.go(AppRoutes.dashboard);
    } on ApiException catch (e) {
      if (e.code == 'otp_required') {
        if (mounted) {
          setState(() => _needsOtp = true);
          showToast(context, e.message);
        }
      } else {
        if (mounted) showToastError(context, e.message);
      }
    } catch (_) {
      if (mounted) showToastError(context, 'Connexion impossible. Vérifiez votre connexion.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc;
    return Column(
      children: [
        Text(
          'Au-delà d\'un simple\naccès au crédit.',
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Sora', fontSize: 26, fontWeight: FontWeight.w800, color: titleColor, height: 1.25),
        ),
        const SizedBox(height: 12),
        Text(
          'Votre historique Mobile Money devient votre garantie.\nConçu pour Kinshasa, pensé pour tous.',
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
          Text('Connexion', style: const TextStyle(fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Numéro illicocash + mot de passe', style: SimbisaText.body(13, color: SimbisaColors.muted)),
          const SizedBox(height: 24),

          NeuTextField(
            label: 'Numéro de téléphone',
            hint: '8XX XXX XXX',
            prefix: const Text('🇨🇩 +243 ', style: TextStyle(fontSize: 13, color: SimbisaColors.muted, fontWeight: FontWeight.w600)),
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
          if (_needsOtp) ...[
            const SizedBox(height: 16),
            NeuTextField(
              label: 'Code OTP (e-mail)',
              hint: '000000',
              prefixIcon: const Icon(Icons.shield_outlined),
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
            ),
          ],
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: GestureDetector(
              onTap: () => context.go(AppRoutes.forgotPassword),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final divColor = (isDark ? Colors.white : Colors.black).withValues(alpha: 0.1);
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: divColor)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('ou', style: SimbisaText.body(12, color: SimbisaColors.muted)),
        ),
        Expanded(child: Container(height: 1, color: divColor)),
      ],
    );
  }

  Widget _buildStats() {
    const stats = [
      ('Rapidité', 'Décision en moins de 3 secondes'),
      ('Respect',  'Confidentialité et transparence'),
      ('Rigueur',  'Scoring à 4 moteurs certifiés'),
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
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(s.$2, textAlign: TextAlign.center, style: SimbisaText.body(9, color: SimbisaColors.muted)),
              ],
            ),
          ),
        ),
      );
      if (i != stats.length - 1) children.add(const SizedBox(width: 10));
    }
    return Row(children: children);
  }
}
