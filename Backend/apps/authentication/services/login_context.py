"""Contexte de connexion : IP, pays, appareil."""
import hashlib
import ipaddress
import logging

logger = logging.getLogger('apps.authentication')


def get_client_ip(request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '') or ''


def _is_private_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return True


def get_country_code(request) -> str:
    """
    Pays ISO-2 : en-têtes proxy, body/login, ou défaut CD (RDC) en local.
    """
    for header in ('HTTP_CF_IPCOUNTRY', 'HTTP_X_SIMBISA_COUNTRY'):
        val = request.META.get(header, '').strip().upper()
        if len(val) == 2 and val.isalpha():
            return val

    ip = get_client_ip(request)
    if not ip or _is_private_ip(ip):
        return 'CD'

    try:
        import urllib.request
        import json
        with urllib.request.urlopen(
            f'http://ip-api.com/json/{ip}?fields=countryCode',
            timeout=2,
        ) as resp:
            data = json.loads(resp.read().decode())
            code = (data.get('countryCode') or '').upper()
            if len(code) == 2:
                return code
    except Exception as e:
        logger.debug(f"GeoIP fallback: {e}")

    return 'CD'


def get_device_id(request, body_device_id: str = '') -> str:
    explicit = (body_device_id or request.META.get('HTTP_X_DEVICE_ID', '')).strip()
    if explicit:
        return explicit[:128]

    ua = request.META.get('HTTP_USER_AGENT', 'unknown')
    ip = get_client_ip(request)
    digest = hashlib.sha256(f'{ua}|{ip}'.encode()).hexdigest()[:32]
    return f'fp-{digest}'


def extract_login_context(request, body: dict | None = None) -> dict:
    body = body or {}
    country = (body.get('country') or '').strip().upper()[:2]
    if not country or len(country) != 2:
        country = get_country_code(request)

    return {
        'ip': get_client_ip(request),
        'country': country,
        'device_id': get_device_id(request, body.get('device_id', '')),
        'user_agent': request.META.get('HTTP_USER_AGENT', '')[:255],
    }
