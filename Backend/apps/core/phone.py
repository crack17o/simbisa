"""Normalisation des numéros de téléphone RDC (+243XXXXXXXXX)."""
import re

COUNTRY_PREFIX = '+243'


def normalize_telephone(raw: str) -> str:
    """Accepte +243XXXXXXXXX, 243XXXXXXXXX, 00243XXXXXXXXX ou 0XXXXXXXXX et renvoie +243XXXXXXXXX."""
    cleaned = re.sub(r'[\s\-]', '', str(raw or '').strip())
    if cleaned.startswith('00243'):
        cleaned = '+243' + cleaned[5:]
    elif cleaned.startswith('+243'):
        pass
    elif cleaned.startswith('243'):
        cleaned = '+' + cleaned
    elif cleaned.startswith('0'):
        cleaned = COUNTRY_PREFIX + cleaned[1:]
    return cleaned


def local_variant(normalized: str) -> str:
    """Variante locale (0XXXXXXXXX) d'un numéro normalisé en +243XXXXXXXXX."""
    if normalized.startswith(COUNTRY_PREFIX):
        return '0' + normalized[len(COUNTRY_PREFIX):]
    return normalized


def is_valid_telephone(normalized: str) -> bool:
    return bool(re.fullmatch(r'\+243\d{9}', normalized))
