import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/core/theme/app_theme.dart';

class ErrorScreen extends StatefulWidget {
  const ErrorScreen({
    super.key,
    this.code = 404,
    this.title,
    this.message,
  });

  final int code;
  final String? title;
  final String? message;

  @override
  State<ErrorScreen> createState() => _ErrorScreenState();
}

class _ErrorScreenState extends State<ErrorScreen> with TickerProviderStateMixin {
  late AnimationController _blob;
  late AnimationController _content;
  late Animation<double> _contentFade;
  late Animation<Offset> _contentSlide;
  late Animation<double> _iconScale;

  static const _configs = {
    404: _ErrCfg(
      emoji: '🔍',
      color: SimbisaColors.blue,
      glowColor: Color(0x2060A5FA),
      defaultTitle: 'Page introuvable',
      defaultMessage: 'La page que vous cherchez n\'existe pas ou a été déplacée.',
    ),
    403: _ErrCfg(
      emoji: '🔒',
      color: SimbisaColors.warning,
      glowColor: Color(0x20F59E0B),
      defaultTitle: 'Accès refusé',
      defaultMessage: 'Vous n\'avez pas les permissions pour accéder à cette section.',
    ),
    500: _ErrCfg(
      emoji: '⚡',
      color: SimbisaColors.danger,
      glowColor: Color(0x20EF4444),
      defaultTitle: 'Erreur serveur',
      defaultMessage: 'Une erreur est survenue de notre côté. Réessayez dans quelques instants.',
    ),
  };

  _ErrCfg get _cfg => _configs[widget.code] ?? const _ErrCfg(
    emoji: '⚠️',
    color: SimbisaColors.or,
    glowColor: Color(0x20D4AF37),
    defaultTitle: 'Quelque chose s\'est mal passé',
    defaultMessage: 'Une erreur inattendue est survenue.',
  );

  @override
  void initState() {
    super.initState();

    _blob = AnimationController(vsync: this, duration: const Duration(seconds: 6))
      ..repeat(reverse: true);

    _content = AnimationController(vsync: this, duration: const Duration(milliseconds: 500));
    _contentFade = CurvedAnimation(parent: _content, curve: Curves.easeOut);
    _contentSlide = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
        .animate(CurvedAnimation(parent: _content, curve: Curves.easeOut));
    _iconScale = Tween<double>(begin: 0.5, end: 1.0)
        .animate(CurvedAnimation(parent: _content, curve: Curves.elasticOut));

    Future.delayed(const Duration(milliseconds: 80), () {
      if (mounted) _content.forward();
    });
  }

  @override
  void dispose() {
    _blob.dispose();
    _content.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = Session.current != null;
    final cfg = _cfg;

    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      body: Stack(children: [
        // ── Blob décoratif animé ──
        Positioned(
          top: -60,
          left: MediaQuery.of(context).size.width / 2 - 120,
          child: AnimatedBuilder(
            animation: _blob,
            builder: (_, __) => Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                color: cfg.glowColor,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(60 + _blob.value * 40),
                  topRight: Radius.circular(30 + _blob.value * 60),
                  bottomLeft: Radius.circular(40 + _blob.value * 50),
                  bottomRight: Radius.circular(70 + _blob.value * 30),
                ),
              ),
            ),
          ),
        ),

        // ── Contenu ──
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),

                // Code erreur
                FadeTransition(
                  opacity: _contentFade,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: cfg.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: cfg.color.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      'Erreur ${widget.code}',
                      style: TextStyle(color: cfg.color, fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Icône
                ScaleTransition(
                  scale: _iconScale,
                  child: FadeTransition(
                    opacity: _contentFade,
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: cfg.glowColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: cfg.color.withValues(alpha: 0.3), width: 2),
                        boxShadow: [BoxShadow(color: cfg.glowColor, blurRadius: 30, spreadRadius: 10)],
                      ),
                      child: Center(
                        child: Text(cfg.emoji, style: const TextStyle(fontSize: 44)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Titre
                SlideTransition(
                  position: _contentSlide,
                  child: FadeTransition(
                    opacity: _contentFade,
                    child: Text(
                      widget.title ?? cfg.defaultTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Sora',
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: SimbisaColors.blanc,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Message
                SlideTransition(
                  position: _contentSlide,
                  child: FadeTransition(
                    opacity: _contentFade,
                    child: Text(
                      widget.message ?? cfg.defaultMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: SimbisaColors.muted, fontSize: 14, height: 1.6),
                    ),
                  ),
                ),

                const Spacer(flex: 2),

                // Boutons
                FadeTransition(
                  opacity: _contentFade,
                  child: Column(children: [
                    if (loggedIn) ...[
                      _ActionButton(
                        label: 'Réessayer',
                        icon: Icons.refresh_rounded,
                        onTap: () => Navigator.of(context).pop(),
                        outline: true,
                        color: cfg.color,
                      ),
                      const SizedBox(height: 10),
                    ],
                    _ActionButton(
                      label: loggedIn ? 'Retour à l\'accueil' : 'Se connecter',
                      icon: loggedIn ? Icons.home_rounded : Icons.login_rounded,
                      onTap: () => context.go(loggedIn ? AppRoutes.dashboard : AppRoutes.login),
                      outline: false,
                      color: cfg.color,
                    ),
                    const SizedBox(height: 32),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

class _ErrCfg {
  const _ErrCfg({
    required this.emoji,
    required this.color,
    required this.glowColor,
    required this.defaultTitle,
    required this.defaultMessage,
  });
  final String emoji;
  final Color color;
  final Color glowColor;
  final String defaultTitle;
  final String defaultMessage;
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    required this.outline,
    required this.color,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool outline;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 15),
        decoration: BoxDecoration(
          color: outline ? Colors.transparent : color,
          borderRadius: BorderRadius.circular(14),
          border: outline ? Border.all(color: color.withValues(alpha: 0.5)) : null,
          boxShadow: outline
              ? null
              : [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 18, color: outline ? color : Colors.white),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: outline ? color : Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ]),
      ),
    );
  }
}
