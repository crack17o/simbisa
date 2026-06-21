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
