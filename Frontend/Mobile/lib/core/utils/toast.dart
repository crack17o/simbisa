import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';

enum ToastType { success, error, warning, info }

class _ToastConfig {
  const _ToastConfig({required this.color, required this.icon, required this.duration});
  final Color color;
  final IconData icon;
  final Duration duration;
}

const _configs = {
  ToastType.success: _ToastConfig(
    color: SimbisaColors.success,
    icon: Icons.check_circle_outline_rounded,
    duration: Duration(seconds: 3),
  ),
  ToastType.error: _ToastConfig(
    color: SimbisaColors.danger,
    icon: Icons.error_outline_rounded,
    duration: Duration(seconds: 5),
  ),
  ToastType.warning: _ToastConfig(
    color: SimbisaColors.warning,
    icon: Icons.warning_amber_rounded,
    duration: Duration(seconds: 4),
  ),
  ToastType.info: _ToastConfig(
    color: SimbisaColors.blue,
    icon: Icons.info_outline_rounded,
    duration: Duration(seconds: 3),
  ),
};

void _showToast(BuildContext context, String message, ToastType type) {
  if (!context.mounted) return;
  final cfg = _configs[type]!;
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      duration: cfg.duration,
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.transparent,
      elevation: 0,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      content: _ToastWidget(message: message, type: type, cfg: cfg),
    ),
  );
}

class _ToastWidget extends StatefulWidget {
  const _ToastWidget({required this.message, required this.type, required this.cfg});
  final String message;
  final ToastType type;
  final _ToastConfig cfg;

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slide,
      child: FadeTransition(
        opacity: _fade,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: SimbisaColors.panel,
            borderRadius: BorderRadius.circular(14),
            border: Border(left: BorderSide(color: widget.cfg.color, width: 4)),
            boxShadow: [
              BoxShadow(color: widget.cfg.color.withValues(alpha: 0.15), blurRadius: 16, spreadRadius: 0),
              BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 6)),
            ],
          ),
          child: Row(children: [
            Icon(widget.cfg.icon, color: widget.cfg.color, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                widget.message,
                style: SimbisaText.body(13, color: SimbisaColors.blanc),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ── API publique ──────────────────────────────────────────────────────────────

void showToast(BuildContext context, String message, {bool isError = false}) =>
    _showToast(context, message, isError ? ToastType.error : ToastType.success);

void showToastError(BuildContext context, String message) =>
    _showToast(context, message, ToastType.error);

void showToastSuccess(BuildContext context, String message) =>
    _showToast(context, message, ToastType.success);

void showToastWarning(BuildContext context, String message) =>
    _showToast(context, message, ToastType.warning);

void showToastInfo(BuildContext context, String message) =>
    _showToast(context, message, ToastType.info);
