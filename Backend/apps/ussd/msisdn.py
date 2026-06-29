import re


def normalize_msisdn(raw: str) -> str:
    """Normalise vers +243XXXXXXXXX."""
    if not raw:
        return ''
    cleaned = re.sub(r'[\s\-]', '', str(raw).strip())
    if cleaned.startswith('00'):
        cleaned = '+' + cleaned[2:]
    if cleaned.startswith('243') and not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    if cleaned.startswith('+243'):
        return cleaned
    if len(cleaned) == 9 and cleaned.isdigit():
        return f'+243{cleaned}'
    return cleaned


# Préfixes réseau DRC (3 chiffres après +243)
_PREFIXES_OPERATEUR = {
    'mpesa':        ['081', '082', '083'],  # Vodacom M-Pesa
    'orange_money': ['084', '085', '089'],          # Orange DRC
    'airtel_money': ['097', '098', '099'],                  # Airtel DRC
    'africell':     ['090', '091'],                         # Africell DRC
}


def detect_operateur(numero: str) -> str | None:
    """
    Retourne l'opérateur mobile money selon le préfixe DRC du numéro.
    Retourne None si le préfixe est inconnu ou le numéro invalide.
    """
    normalized = normalize_msisdn(numero)
    if not normalized.startswith('+243') or len(normalized) < 7:
        return None
    prefix = normalized[4:7]
    for operateur, prefixes in _PREFIXES_OPERATEUR.items():
        if prefix in prefixes:
            return operateur
    return None
