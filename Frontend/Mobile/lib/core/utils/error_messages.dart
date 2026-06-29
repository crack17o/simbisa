import '../services/api_client.dart';

class ErrorMessages {
  static String normalize(ApiException e) {
    if (e.code != null && _codeMessages.containsKey(e.code)) {
      return _codeMessages[e.code]!;
    }
    if (e.statusCode != null && _statusMessages.containsKey(e.statusCode)) {
      return _statusMessages[e.statusCode]!;
    }
    final msg = e.message;
    if (msg.length > 120 || msg.contains('stack') || msg.startsWith('Error:')) {
      return 'Une erreur inattendue est survenue. Réessayez plus tard.';
    }
    return msg.isNotEmpty ? msg : 'Une erreur inattendue est survenue.';
  }

  static const _statusMessages = {
    400: 'Les informations saisies sont incorrectes.',
    401: 'Identifiants incorrects ou session expirée.',
    403: 'Vous n\'avez pas l\'autorisation d\'effectuer cette action.',
    404: 'La ressource demandée est introuvable.',
    409: 'Cette opération est en conflit avec une ressource existante.',
    429: 'Trop de tentatives. Patientez quelques minutes.',
    500: 'Une erreur est survenue de notre côté. Réessayez plus tard.',
    503: 'Service temporairement indisponible. Réessayez plus tard.',
  };

  static const _codeMessages = {
    'invalid_credentials':   'Identifiants incorrects.',
    'account_locked':        'Compte temporairement bloqué. Réessayez dans 30 minutes.',
    'account_suspended':     'Votre compte est suspendu. Contactez le support.',
    'otp_invalid':           'Code de vérification incorrect.',
    'otp_expired':           'Code expiré. Demandez-en un nouveau.',
    'kyc_required':          'Votre pièce d\'identité doit être validée avant de continuer.',
    'kyc_expired':           'Votre pièce d\'identité est expirée. Soumettez-en une nouvelle.',
    'credit_active':         'Vous avez déjà un crédit actif dans cette devise.',
    'insufficient_balance':  'Solde insuffisant pour cette opération.',
    'plafond_niveau_compte': 'Ce montant dépasse le plafond de votre niveau de compte.',
    'duree_hors_plafond':    'La durée demandée dépasse le maximum autorisé pour votre niveau.',
    'operator_mismatch':     'Le numéro saisi ne correspond pas à l\'opérateur sélectionné.',
    'wallet_inactive':       'Ce wallet est inactif. Contactez votre agent.',
    'token_expired':         'Session expirée. Reconnectez-vous.',
    'permission_denied':     'Action non autorisée pour votre rôle.',
  };
}
