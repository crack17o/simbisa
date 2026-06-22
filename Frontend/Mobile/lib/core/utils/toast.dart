import 'package:flutter/material.dart';
import 'package:simbisa/core/theme/app_theme.dart';

void showToast(BuildContext context, String message, {bool isError = false}) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message, style: SimbisaText.body(13, color: SimbisaColors.blanc)),
      backgroundColor: isError ? SimbisaColors.danger : const Color(0xFF2C2C2C),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      duration: Duration(seconds: isError ? 4 : 3),
    ),
  );
}

void showToastError(BuildContext context, String message) =>
    showToast(context, message, isError: true);

void showToastSuccess(BuildContext context, String message) =>
    showToast(context, message);
