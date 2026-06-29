import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';

enum ResultStatus { success, error, pending, info }

class OperationResultScreen extends StatefulWidget {
  const OperationResultScreen({
    super.key,
    required this.status,
    required this.title,
    required this.description,
    this.details = const {},
    this.primaryLabel = 'Retour',
    this.primaryAction,
    this.secondaryLabel,
    this.secondaryAction,
  });

  final ResultStatus status;
  final String title;
  final String description;
  final Map<String, String> details;
  final String primaryLabel;
  final VoidCallback? primaryAction;
  final String? secondaryLabel;
  final VoidCallback? secondaryAction;

  @override
  State<OperationResultScreen> createState() => _OperationResultScreenState();
}

class _OperationResultScreenState extends State<OperationResultScreen>
    with TickerProviderStateMixin {
  late AnimationController _badge;
  late AnimationController _content;
  late Animation<double> _badgeScale;
  late Animation<double> _badgeOpacity;
  late Animation<double> _contentFade;
  late Animation<Offset> _contentSlide;

  static const _cfgs = {
    ResultStatus.success: _Cfg(
      icon: Icons.check_circle_rounded,
      color: SimbisaColors.success,
      label: 'Succès',
      bgColor: Color(0x1A22C55E),
    ),
    ResultStatus.error: _Cfg(
      icon: Icons.cancel_rounded,
      color: SimbisaColors.danger,
      label: 'Échec',
      bgColor: Color(0x1AEF4444),
    ),
    ResultStatus.pending: _Cfg(
      icon: Icons.access_time_rounded,
      color: SimbisaColors.warning,
      label: 'En cours',
      bgColor: Color(0x1AF59E0B),
    ),
    ResultStatus.info: _Cfg(
      icon: Icons.info_rounded,
      color: SimbisaColors.blue,
      label: 'Information',
      bgColor: Color(0x1A60A5FA),
    ),
  };

  _Cfg get _cfg => _cfgs[widget.status]!;

  @override
  void initState() {
    super.initState();
    _badge = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _content = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));

    _badgeScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _badge, curve: Curves.elasticOut),
    );
    _badgeOpacity = CurvedAnimation(parent: _badge, curve: const Interval(0.0, 0.5));
    _contentFade = CurvedAnimation(parent: _content, curve: Curves.easeOut);
    _contentSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(CurvedAnimation(parent: _content, curve: Curves.easeOut));

    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) {
        _badge.forward();
        Future.delayed(const Duration(milliseconds: 250), () {
          if (mounted) _content.forward();
        });
      }
    });
  }

  @override
  void dispose() {
    _badge.dispose();
    _content.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // ── Badge animé ──
              ScaleTransition(
                scale: _badgeScale,
                child: FadeTransition(
                  opacity: _badgeOpacity,
                  child: _Badge(cfg: _cfg, status: widget.status),
                ),
              ),
              const SizedBox(height: 32),

              // ── Contenu ──
              SlideTransition(
                position: _contentSlide,
                child: FadeTransition(
                  opacity: _contentFade,
                  child: Column(children: [
                    // Statut badge texte
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(
                        color: _cfg.bgColor,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _cfg.color.withValues(alpha: 0.35)),
                      ),
                      child: Text(_cfg.label,
                          style: TextStyle(color: _cfg.color, fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(height: 16),

                    // Titre
                    Text(widget.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Sora',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: SimbisaColors.blanc,
                        )),
                    const SizedBox(height: 10),

                    // Description
                    Text(widget.description,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: SimbisaColors.muted, fontSize: 14, height: 1.6)),

                    // Détails
                    if (widget.details.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: SimbisaColors.panel,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                        ),
                        child: Column(
                          children: widget.details.entries.map((e) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 5),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(e.key,
                                    style: const TextStyle(color: SimbisaColors.muted, fontSize: 13)),
                                Flexible(
                                  child: Text(e.value,
                                      style: const TextStyle(
                                          color: SimbisaColors.blanc,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600),
                                      textAlign: TextAlign.end),
                                ),
                              ],
                            ),
                          )).toList(),
                        ),
                      ),
                    ],
                  ]),
                ),
              ),

              const Spacer(),

              // ── Boutons ──
              FadeTransition(
                opacity: _contentFade,
                child: Column(children: [
                  if (widget.secondaryLabel != null && widget.secondaryAction != null)
                    GestureDetector(
                      onTap: widget.secondaryAction,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: SimbisaColors.panel,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        ),
                        child: Text(widget.secondaryLabel!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: SimbisaColors.muted, fontSize: 14, fontWeight: FontWeight.w500)),
                      ),
                    ),
                  GestureDetector(
                    onTap: widget.primaryAction ?? () => Navigator.of(context).pop(),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: _cfg.color,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(color: _cfg.color.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 6)),
                        ],
                      ),
                      child: Text(widget.primaryLabel,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

class _Cfg {
  const _Cfg({required this.icon, required this.color, required this.label, required this.bgColor});
  final IconData icon;
  final Color color;
  final String label;
  final Color bgColor;
}

class _Badge extends StatefulWidget {
  const _Badge({required this.cfg, required this.status});
  final _Cfg cfg;
  final ResultStatus status;

  @override
  State<_Badge> createState() => _BadgeState();
}

class _BadgeState extends State<_Badge> with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, __) => Container(
        width: 110,
        height: 110,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.cfg.bgColor,
          boxShadow: [
            BoxShadow(
              color: widget.cfg.color.withValues(alpha: 0.15 + _pulse.value * 0.2),
              blurRadius: 30 + _pulse.value * 20,
              spreadRadius: 0,
            ),
          ],
          border: Border.all(color: widget.cfg.color.withValues(alpha: 0.4), width: 2),
        ),
        child: Icon(widget.cfg.icon, size: 52, color: widget.cfg.color),
      ),
    );
  }
}
