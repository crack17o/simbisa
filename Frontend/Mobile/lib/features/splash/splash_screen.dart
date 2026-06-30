import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/core/theme/app_theme.dart';

// ── Splash Screen ─────────────────────────────────────────────────────────────
//
// Timeline (total 3 800 ms) :
//  0.00–0.10  Fond passe de noir à surface
//  0.08–0.18  Logo container apparaît (fade + scale)
//  0.10–0.52  Trait S se dessine le long du chemin
//  0.28–0.52  Halo doré se dilate puis disparaît
//  0.52–0.68  Rebond du logo (élastic)
//  0.54–0.74  Shimmer balayage doré
//  0.58–0.74  "SIMBISA" glisse vers le haut
//  0.68–0.82  Sous-titre apparaît
//  0.87–1.00  Fondu noir → navigation
// ──────────────────────────────────────────────────────────────────────────────

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  late final Animation<double> _bgFade;
  late final Animation<double> _logoFade;
  late final Animation<double> _logoEntrance;
  late final Animation<double> _pathProgress;
  late final Animation<double> _haloScale;
  late final Animation<double> _haloOpacity;
  late final Animation<double> _logoScale;
  late final Animation<double> _shimmer;
  late final Animation<double> _titleFade;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _subtitleFade;
  late final Animation<double> _exitOverlay;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3800),
    );

    _bgFade       = _anim(0.00, 0.10, Curves.easeOut);
    _logoFade     = _anim(0.08, 0.20, Curves.easeOut);
    _logoEntrance = _anim(0.08, 0.22, Curves.easeOutBack);
    _pathProgress = _anim(0.10, 0.52, Curves.easeInOut);

    _haloScale = Tween<double>(begin: 0.0, end: 2.8).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.28, 0.52, curve: Curves.easeOut),
      ),
    );
    _haloOpacity = Tween<double>(begin: 0.55, end: 0.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.28, 0.52, curve: Curves.easeOut),
      ),
    );

    _logoScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.07), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.07, end: 1.0), weight: 60),
    ]).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.52, 0.68, curve: Curves.easeInOut),
      ),
    );

    _shimmer = Tween<double>(begin: -1.4, end: 2.6).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.54, 0.74, curve: Curves.easeInOut),
      ),
    );

    _titleFade  = _anim(0.58, 0.74, Curves.easeOut);
    _titleSlide = Tween<Offset>(
      begin: const Offset(0, 0.7),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.58, 0.74, curve: Curves.easeOut),
      ),
    );
    _subtitleFade = _anim(0.68, 0.82, Curves.easeOut);
    _exitOverlay  = _anim(0.87, 1.00, Curves.easeIn);

    _ctrl.forward().whenComplete(_navigate);
  }

  Animation<double> _anim(double s, double e, Curve c) =>
      Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: _ctrl, curve: Interval(s, e, curve: c)),
      );

  void _navigate() {
    if (!mounted) return;
    context.go(
      Session.current != null ? AppRoutes.dashboard : AppRoutes.login,
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SimbisaColors.noir,
      body: AnimatedBuilder(
        animation: _ctrl,
        builder: (context, _) => Stack(
          children: [
            // ── Fond ──────────────────────────────────────────────────────────
            Positioned.fill(
              child: Opacity(
                opacity: _bgFade.value,
                child: const ColoredBox(color: SimbisaColors.surface),
              ),
            ),

            // ── Contenu centré ────────────────────────────────────────────────
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo
                  Transform.scale(
                    scale: _logoScale.value,
                    child: Opacity(
                      opacity: _logoFade.value,
                      child: Transform.scale(
                        scale: 0.85 + _logoEntrance.value * 0.15,
                        child: SizedBox(
                          width: 148,
                          height: 148,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              // Halo
                              Transform.scale(
                                scale: _haloScale.value,
                                child: Container(
                                  width: 104,
                                  height: 104,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: SimbisaColors.or
                                          .withOpacity(_haloOpacity.value),
                                      width: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                              // Second halo (décalé)
                              Transform.scale(
                                scale: _haloScale.value * 0.65,
                                child: Container(
                                  width: 104,
                                  height: 104,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: SimbisaColors.orLight
                                          .withOpacity(_haloOpacity.value * 0.4),
                                      width: 1.0,
                                    ),
                                  ),
                                ),
                              ),

                              // Fond de l'icône
                              Container(
                                width: 128,
                                height: 128,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF1F1F1F),
                                      Color(0xFF0C0C0C),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(30),
                                  boxShadow: [
                                    BoxShadow(
                                      color: SimbisaColors.or.withOpacity(0.30),
                                      blurRadius: 28,
                                      spreadRadius: 0,
                                    ),
                                    const BoxShadow(
                                      color: Color(0xFF050505),
                                      blurRadius: 18,
                                      offset: Offset(6, 8),
                                    ),
                                    const BoxShadow(
                                      color: Color(0xFF252525),
                                      blurRadius: 14,
                                      offset: Offset(-5, -5),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(30),
                                  child: Padding(
                                    padding: const EdgeInsets.all(20),
                                    child: CustomPaint(
                                      painter: _SLogoPainter(
                                        progress: _pathProgress.value,
                                        shimmer: _shimmer.value,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // Titre SIMBISA
                  ClipRect(
                    child: SlideTransition(
                      position: _titleSlide,
                      child: FadeTransition(
                        opacity: _titleFade,
                        child: const Text(
                          'SIMBISA',
                          style: TextStyle(
                            fontFamily: 'Sora',
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            color: SimbisaColors.blanc,
                            letterSpacing: 8,
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Sous-titre
                  FadeTransition(
                    opacity: _subtitleFade,
                    child: const Text(
                      'RAWBANK  ·  FINTECH',
                      style: TextStyle(
                        fontFamily: 'Sora',
                        fontSize: 10,
                        fontWeight: FontWeight.w400,
                        color: SimbisaColors.or,
                        letterSpacing: 4.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Fondu de sortie ───────────────────────────────────────────────
            if (_exitOverlay.value > 0)
              Positioned.fill(
                child: Opacity(
                  opacity: _exitOverlay.value,
                  child: const ColoredBox(color: SimbisaColors.noir),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── CustomPainter : le S doré ─────────────────────────────────────────────────

class _SLogoPainter extends CustomPainter {
  final double progress; // 0.0 → 1.0 (avancement du tracé)
  final double shimmer;  // -1.4 → 2.6 (balayage horizontal du reflet)

  const _SLogoPainter({required this.progress, required this.shimmer});

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final path     = _buildS(size);
    final animated = _extract(path, progress);
    final rect     = Rect.fromLTWH(0, 0, size.width, size.height);

    // Couche glow (flou + dorée, trait large)
    canvas.drawPath(
      animated,
      Paint()
        ..shader    = _goldShader(rect)
        ..strokeWidth = size.width * 0.32
        ..strokeCap   = StrokeCap.round
        ..strokeJoin  = StrokeJoin.round
        ..style       = PaintingStyle.stroke
        ..maskFilter  = const MaskFilter.blur(BlurStyle.normal, 7),
    );

    // Couche principale (trait net, doré)
    canvas.drawPath(
      animated,
      Paint()
        ..shader    = _goldShader(rect)
        ..strokeWidth = size.width * 0.19
        ..strokeCap   = StrokeCap.round
        ..strokeJoin  = StrokeJoin.round
        ..style       = PaintingStyle.stroke,
    );

    // Reflet nacré (shimmer) quand le S est presque complet
    if (progress > 0.82 && shimmer > -1.0) {
      canvas.drawRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            colors: [
              Colors.white.withOpacity(0.0),
              Colors.white.withOpacity(0.50),
              Colors.white.withOpacity(0.0),
            ],
            stops: const [0.0, 0.5, 1.0],
            begin: Alignment(shimmer - 0.5, -1.0),
            end:   Alignment(shimmer + 0.5,  1.0),
          ).createShader(rect)
          ..blendMode = BlendMode.srcATop,
      );
    }
  }

  /// Chemin du S normalisé à la taille du widget.
  Path _buildS(Size size) {
    final w = size.width;
    final h = size.height;
    final p = Path();

    p.moveTo(w * 0.28, h * 0.19);
    p.cubicTo(
      w * 0.28, h * 0.03,  // ctrl1 — tire vers le haut-gauche
      w * 0.72, h * 0.03,  // ctrl2 — tire vers le haut-droite
      w * 0.72, h * 0.29,  // fin   — bord droit, haut
    );
    p.cubicTo(
      w * 0.72, h * 0.47,  // ctrl1 — continue bas-droite
      w * 0.28, h * 0.52,  // ctrl2 — croise vers la gauche
      w * 0.28, h * 0.71,  // fin   — bord gauche, bas
    );
    p.cubicTo(
      w * 0.28, h * 0.97,  // ctrl1 — tire vers le bas-gauche
      w * 0.72, h * 0.97,  // ctrl2 — tire vers le bas-droite
      w * 0.72, h * 0.81,  // fin   — bord droit, bas
    );

    return p;
  }

  Path _extract(Path path, double t) {
    final out = Path();
    for (final m in path.computeMetrics()) {
      out.addPath(m.extractPath(0, m.length * t), Offset.zero);
    }
    return out;
  }

  Shader _goldShader(Rect rect) => const LinearGradient(
    colors: [Color(0xFFF8E070), Color(0xFFD4AF37), Color(0xFF7A5200)],
    begin: Alignment.topCenter,
    end:   Alignment.bottomCenter,
  ).createShader(rect);

  @override
  bool shouldRepaint(_SLogoPainter old) =>
      old.progress != progress || old.shimmer != shimmer;
}
