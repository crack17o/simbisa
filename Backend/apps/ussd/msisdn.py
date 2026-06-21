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
