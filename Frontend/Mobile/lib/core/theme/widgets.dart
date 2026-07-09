import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/formatters.dart';
import 'app_theme.dart';

// ─── NeuCard ─────────────────────────────────────────────────────────────────
class NeuCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final List<BoxShadow>? shadows;
  final Color? color;
  final Gradient? gradient;
  final VoidCallback? onTap;

  const NeuCard({
    super.key,
    required this.child,
    this.padding,
    this.radius = 20,
    this.shadows,
    this.color,
    this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = color ?? (isDark ? SimbisaColors.panel : SimbisaLightColors.panel);
    final fgColor = isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc;

    final container = Container(
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: gradient != null ? null : bgColor,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: shadows ?? NeuShadow.flatAdaptive(context),
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: fgColor),
        child: child,
      ),
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: container);
    }
    return container;
  }
}

// ─── NeuInset ────────────────────────────────────────────────────────────────
class NeuInset extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;

  const NeuInset({super.key, required this.child, this.padding, this.radius = 16});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? SimbisaColors.surface : SimbisaLightColors.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: NeuShadow.insetAdaptive(context),
      ),
      child: child,
    );
  }
}

// ─── NeuButton ───────────────────────────────────────────────────────────────
class NeuButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final bool loading;
  final bool gold;
  final bool secondary;
  final double? width;

  const NeuButton({
    super.key,
    required this.child,
    this.onTap,
    this.loading = false,
    this.gold = true,
    this.secondary = false,
    this.width,
  });

  @override
  State<NeuButton> createState() => _NeuButtonState();
}

class _NeuButtonState extends State<NeuButton> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 100));
    _scale = Tween(begin: 1.0, end: 0.96).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final secondaryBg   = isDark ? SimbisaColors.panel : SimbisaLightColors.panel;
    final secondaryText = isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc;

    return GestureDetector(
      onTapDown: (_) => _ctrl.forward(),
      onTapUp: (_) { _ctrl.reverse(); widget.onTap?.call(); },
      onTapCancel: () => _ctrl.reverse(),
      child: ScaleTransition(
        scale: _scale,
        child: Container(
          width: widget.width,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            gradient: widget.gold && !widget.secondary ? SimbisaColors.goldGradient : null,
            color: widget.secondary ? secondaryBg : null,
            borderRadius: BorderRadius.circular(16),
            boxShadow: widget.gold && !widget.secondary
                ? NeuShadow.goldGlow()
                : NeuShadow.flatAdaptive(context),
            border: widget.secondary
                ? Border.all(color: SimbisaColors.or.withValues(alpha: 0.2))
                : null,
          ),
          child: Center(
            child: widget.loading
                ? const SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(SimbisaColors.noir),
                    ),
                  )
                : DefaultTextStyle(
                    style: TextStyle(
                      fontFamily: 'Sora',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: widget.gold && !widget.secondary
                          ? SimbisaColors.noir
                          : secondaryText,
                    ),
                    child: widget.child,
                  ),
          ),
        ),
      ),
    );
  }
}

// ─── NeuTextField ────────────────────────────────────────────────────────────
class NeuTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final Widget? prefixIcon;
  final Widget? prefix;
  final Widget? suffixIcon;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final List<TextInputFormatter>? inputFormatters;

  const NeuTextField({
    super.key,
    this.label,
    this.hint,
    this.prefixIcon,
    this.prefix,
    this.suffixIcon,
    this.controller,
    this.keyboardType,
    this.obscureText = false,
    this.errorText,
    this.onChanged,
    this.inputFormatters,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor   = isDark ? SimbisaColors.blanc  : SimbisaLightColors.blanc;
    final mutedColor  = isDark ? SimbisaColors.muted  : SimbisaLightColors.muted;
    final bgColor     = isDark ? SimbisaColors.surface : SimbisaLightColors.surface;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!.toUpperCase(), style: SimbisaText.label(color: mutedColor)),
          const SizedBox(height: 8),
        ],
        Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(14),
            boxShadow: NeuShadow.insetAdaptive(context),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscureText,
            onChanged: onChanged,
            inputFormatters: inputFormatters,
            style: SimbisaText.body(14, color: textColor),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: SimbisaText.body(14, color: mutedColor.withValues(alpha: 0.5)),
              prefix: prefix,
              prefixIcon: prefixIcon != null
                  ? IconTheme(data: IconThemeData(color: mutedColor, size: 18), child: prefixIcon!)
                  : null,
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              errorText: errorText,
              errorStyle: SimbisaText.body(11, color: SimbisaColors.danger),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── GoldBadge ───────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String label;
  final _BadgeType type;

  const StatusBadge.success(this.label, {super.key}) : type = _BadgeType.success;
  const StatusBadge.warning(this.label, {super.key}) : type = _BadgeType.warning;
  const StatusBadge.danger(this.label, {super.key}) : type = _BadgeType.danger;
  const StatusBadge.gold(this.label, {super.key}) : type = _BadgeType.gold;
  const StatusBadge.muted(this.label, {super.key}) : type = _BadgeType.muted;

  factory StatusBadge.fromStatus(String status) {
    final label = statutLabel(status);
    switch (status.toLowerCase()) {
      case 'approuvé':
      case 'approuve':
      case 'remboursé':
      case 'rembourse': return StatusBadge.success(label);
      case 'rejeté':
      case 'rejete': return StatusBadge.danger(label);
      case 'en cours':
      case 'encours': return StatusBadge.gold(label);
      case 'en attente':
      case 'en_analyse':
      case 'mise_en_attente': return StatusBadge.warning(label);
      default: return StatusBadge.muted(label);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (type) {
      _BadgeType.success => (SimbisaColors.success.withOpacity(0.12), SimbisaColors.success, SimbisaColors.success.withOpacity(0.25)),
      _BadgeType.warning => (SimbisaColors.warning.withOpacity(0.12), SimbisaColors.warning, SimbisaColors.warning.withOpacity(0.25)),
      _BadgeType.danger  => (SimbisaColors.danger.withOpacity(0.12), SimbisaColors.danger, SimbisaColors.danger.withOpacity(0.25)),
      _BadgeType.gold    => (SimbisaColors.or.withOpacity(0.12), SimbisaColors.orLight, SimbisaColors.or.withOpacity(0.25)),
      _BadgeType.muted   => (Colors.white.withOpacity(0.05), SimbisaColors.muted, Colors.white.withOpacity(0.1)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: fg, letterSpacing: 0.8),
      ),
    );
  }
}

enum _BadgeType { success, warning, danger, gold, muted }

// ─── GradientText ─────────────────────────────────────────────────────────────
class GradientText extends StatelessWidget {
  final String text;
  final TextStyle style;
  final Gradient gradient;

  const GradientText(this.text, {super.key, required this.style, this.gradient = SimbisaColors.goldGradient});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
      child: Text(text, style: style.copyWith(color: Colors.white)),
    );
  }
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────
class ScoreRing extends StatefulWidget {
  final int score;
  final double size;
  final String label;

  const ScoreRing({super.key, required this.score, this.size = 120, this.label = 'Score'});

  @override
  State<ScoreRing> createState() => _ScoreRingState();
}

class _ScoreRingState extends State<ScoreRing> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _anim = Tween(begin: 0.0, end: widget.score / 100).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final color = widget.score >= 70 ? SimbisaColors.success
        : widget.score >= 45 ? SimbisaColors.warning
        : SimbisaColors.danger;

    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: widget.size,
              height: widget.size,
              child: CustomPaint(
                painter: _RingPainter(value: _anim.value, color: color),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${(widget.score * _anim.value).round()}',
                        style: TextStyle(fontFamily: 'Sora', fontSize: widget.size * 0.22, fontWeight: FontWeight.w800, color: color),
                      ),
                      Text('/100', style: SimbisaText.body(widget.size * 0.1, color: SimbisaColors.muted)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(widget.label.toUpperCase(), style: SimbisaText.label()),
          ],
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final Color color;
  _RingPainter({required this.value, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 16) / 2;
    final trackPaint = Paint()
      ..color = const Color(0xFF232323)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);

    final sweep = (2 * 3.14159 * value).clamp(0.001, 2 * 3.14159);
    if (value <= 0.001) return;

    final progressPaint = Paint()
      ..shader = SweepGradient(
        startAngle: -1.5708,
        endAngle: -1.5708 + sweep,
        colors: [color.withOpacity(0.6), color],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -1.5708,
      sweep,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.value != value;
}

// ─── NeuProgressBar ──────────────────────────────────────────────────────────
class NeuProgressBar extends StatelessWidget {
  final double value; // 0.0 → 1.0
  final Color color;
  final double height;

  const NeuProgressBar({super.key, required this.value, this.color = SimbisaColors.or, this.height = 8});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? SimbisaColors.surface : SimbisaLightColors.surface,
        borderRadius: BorderRadius.circular(height),
        boxShadow: NeuShadow.insetAdaptive(context, blur: 6, offset: 3),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(height),
        child: FractionallySizedBox(
          alignment: Alignment.centerLeft,
          widthFactor: value.clamp(0.0, 1.0),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [color.withOpacity(0.7), color]),
              boxShadow: [BoxShadow(color: color.withOpacity(0.5), blurRadius: 6)],
              borderRadius: BorderRadius.circular(height),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;

  const SectionHeader({super.key, required this.title, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? SimbisaColors.blanc : SimbisaLightColors.blanc;
    final orColor    = isDark ? SimbisaColors.or    : SimbisaLightColors.or;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700, color: titleColor)),
        if (action != null)
          GestureDetector(
            onTap: onAction,
            child: Text(action!, style: SimbisaText.body(12, color: orColor)),
          ),
      ],
    );
  }
}
