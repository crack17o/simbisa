"""Taux de change USD/CDF — lecture cache + fallback settings."""
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache

CACHE_KEY = 'simbisa:cdf_per_usd'
CACHE_TTL = 300


def get_cdf_per_usd() -> int:
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return int(cached)

    try:
        from apps.core.models import PlatformConfig
        rate = PlatformConfig.load().cdf_per_usd
    except Exception:
        rate = settings.CDF_PER_USD

    cache.set(CACHE_KEY, rate, CACHE_TTL)
    return int(rate)


def set_cdf_per_usd(rate: int, user=None) -> int:
    from apps.core.models import PlatformConfig
    config = PlatformConfig.load()
    config.cdf_per_usd = int(rate)
    if user is not None:
        config.updated_by = user
    config.save(update_fields=['cdf_per_usd', 'updated_by', 'updated_at'])
    cache.set(CACHE_KEY, int(rate), CACHE_TTL)
    return int(rate)


def invalidate_cdf_cache():
    cache.delete(CACHE_KEY)


def usd_to_cdf(amount_usd) -> Decimal:
    return Decimal(str(amount_usd)) * Decimal(get_cdf_per_usd())


def cdf_to_usd(amount_cdf) -> Decimal:
    rate = Decimal(get_cdf_per_usd())
    if rate == 0:
        return Decimal('0')
    return Decimal(str(amount_cdf)) / rate
