import 'package:flutter/services.dart';

/// Formate automatiquement une saisie de date en JJ/MM/AAAA à la frappe.
/// Les chiffres saisis sont insérés dans le masque DD/MM/YYYY.
class DateInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final buf = StringBuffer();
    for (int i = 0; i < digits.length && i < 8; i++) {
      if (i == 2 || i == 4) buf.write('/');
      buf.write(digits[i]);
    }
    final text = buf.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Convertit JJ/MM/AAAA → AAAA-MM-JJ pour l'API. Retourne null si invalide.
String? displayDateToIso(String display) {
  final parts = display.split('/');
  if (parts.length != 3) return null;
  final day = parts[0].padLeft(2, '0');
  final month = parts[1].padLeft(2, '0');
  final year = parts[2];
  if (year.length != 4) return null;
  return '$year-$month-$day';
}

String formatMoney(String symbole, num amount, {int decimals = 0}) {
  final value = amount.toStringAsFixed(decimals);
  return '$symbole$value';
}

String formatDate(dynamic raw) {
  if (raw == null) return '—';
  final text = raw.toString();
  final parsed = DateTime.tryParse(text);
  if (parsed == null) return text;
  final d = parsed.toLocal();
  final day = d.day.toString().padLeft(2, '0');
  final month = d.month.toString().padLeft(2, '0');
  return '$day/$month/${d.year}';
}

String statutLabel(String statut) {
  switch (statut.toLowerCase()) {
    case 'approuve':
      return 'Approuvé';
    case 'rejete':
      return 'Rejeté';
    case 'en_analyse':
      return 'En analyse';
    case 'mise_en_attente':
      return 'En attente';
    case 'en_cours':
      return 'En cours';
    case 'rembourse':
      return 'Remboursé';
    case 'defaut':
      return 'Défaut';
    case 'cloture':
      return 'Clôturé';
    case 'annule':
      return 'Annulé';
    default:
      return statut;
  }
}

String riskLabel(String? niveau) {
  switch (niveau?.toLowerCase()) {
    case 'faible':
      return 'Faible';
    case 'moyen':
      return 'Moyen';
    case 'eleve':
    case 'élevé':
      return 'Élevé';
    default:
      return niveau ?? '—';
  }
}
