import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/toast.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _auth = AuthService();
  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  final _pwd2Ctrl = TextEditingController();

  int _step = 0; // 0=email, 1=otp, 2=password, 3=done
  String _email = '';
  String _resetToken = '';
  bool _loading = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    _pwdCtrl.dispose();
    _pwd2Ctrl.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      showToastError(context, 'Saisissez une adresse e-mail valide.');
      return;
    }
    setState(() => _loading = true);
    try {
      await _auth.forgotPassword(email);
      _email = email;
      if (mounted) {
        showToast(context, 'Code envoyé à $email');
        setState(() => _step = 1);
      }
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Impossible d\'envoyer le code.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length != 6) {
      showToastError(context, 'Code à 6 chiffres requis.');
      return;
    }
    setState(() => _loading = true);
    try {
      final token = await _auth.verifyResetOtp(_email, otp);
      _resetToken = token;
      if (mounted) setState(() => _step = 2);
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Code invalide ou expiré.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    final pwd = _pwdCtrl.text;
    if (pwd.length < 8) {
      showToastError(context, 'Minimum 8 caractères.');
      return;
    }
    if (pwd != _pwd2Ctrl.text) {
      showToastError(context, 'Les mots de passe ne correspondent pas.');
      return;
    }
    setState(() => _loading = true);
    try {
      await _auth.resetPassword(
        email: _email,
        resetToken: _resetToken,
        newPassword: pwd,
      );
      if (mounted) setState(() => _step = 3);
    } on ApiException catch (e) {
      if (mounted) showToastError(context, e.message);
    } catch (_) {
      if (mounted) showToastError(context, 'Réinitialisation impossible.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: const Text('Mot de passe oublié'),
        backgroundColor: SimbisaColors.panel,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildStepIndicator(),
              const SizedBox(height: 24),
              NeuCard(child: _buildStepContent()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final labels = ['E-mail', 'Code OTP', 'Nouveau MDP'];
    return Row(
      children: List.generate(labels.length, (i) {
        final active = i <= _step;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: active ? SimbisaColors.or : Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(labels[i], style: SimbisaText.body(10, color: active ? SimbisaColors.or : SimbisaColors.muted)),
                  ],
                ),
              ),
              if (i < labels.length - 1) const SizedBox(width: 8),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildStepContent() {
    if (_step == 3) return _buildDone();
    if (_step == 2) return _buildPasswordStep();
    if (_step == 1) return _buildOtpStep();
    return _buildEmailStep();
  }

  Widget _buildEmailStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Votre adresse e-mail', style: SimbisaText.display(18)),
        const SizedBox(height: 6),
        Text('Un code de vérification vous sera envoyé.', style: SimbisaText.body(13, color: SimbisaColors.muted)),
        const SizedBox(height: 20),
        NeuTextField(
          label: 'Adresse e-mail du compte',
          hint: 'vous@exemple.cd',
          prefixIcon: const Icon(Icons.email_outlined),
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 20),
        NeuButton(width: double.infinity, loading: _loading, onTap: _sendCode, child: const Text('Envoyer le code')),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Code de vérification', style: SimbisaText.display(18)),
        const SizedBox(height: 6),
        Text('Code envoyé à $_email', style: SimbisaText.body(13, color: SimbisaColors.muted)),
        const SizedBox(height: 20),
        NeuTextField(
          label: 'Code à 6 chiffres',
          hint: '000000',
          prefixIcon: const Icon(Icons.shield_outlined),
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          onChanged: (v) {
            if (v.length > 6) _otpCtrl.text = v.substring(0, 6);
          },
        ),
        const SizedBox(height: 20),
        NeuButton(width: double.infinity, loading: _loading, onTap: _verifyOtp, child: const Text('Valider le code')),
        const SizedBox(height: 12),
        NeuButton(
          gold: false,
          secondary: true,
          width: double.infinity,
          onTap: () => setState(() => _step = 0),
          child: Text('← Changer l\'e-mail', style: SimbisaText.body(14, color: SimbisaColors.muted)),
        ),
      ],
    );
  }

  Widget _buildPasswordStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Nouveau mot de passe', style: SimbisaText.display(18)),
        const SizedBox(height: 20),
        NeuTextField(
          label: 'Nouveau mot de passe',
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
        NeuButton(width: double.infinity, loading: _loading, onTap: _resetPassword, child: const Text('Enregistrer')),
      ],
    );
  }

  Widget _buildDone() {
    return Column(
      children: [
        const SizedBox(height: 16),
        Container(
          width: 64, height: 64,
          decoration: BoxDecoration(
            color: SimbisaColors.success.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_circle_rounded, color: SimbisaColors.success, size: 32),
        ),
        const SizedBox(height: 20),
        Text('Mot de passe réinitialisé', style: SimbisaText.display(18)),
        const SizedBox(height: 8),
        Text('Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', style: SimbisaText.body(13, color: SimbisaColors.muted), textAlign: TextAlign.center),
        const SizedBox(height: 24),
        NeuButton(
          width: double.infinity,
          onTap: () => context.go(AppRoutes.login),
          child: const Text('Se connecter'),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
