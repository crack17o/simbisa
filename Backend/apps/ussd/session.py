import json
import uuid
from django.conf import settings
from django.core.cache import cache

DEFAULT_STATE = {
    'authenticated': False,
    'state': 'INIT',
    'ctx': {},
}


class UssdSessionStore:
    def __init__(self, session_id: str | None = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.ttl = getattr(settings, 'USSD_SESSION_TTL', 180)

    @property
    def cache_key(self) -> str:
        return f'ussd:session:{self.session_id}'

    def load(self) -> dict:
        raw = cache.get(self.cache_key)
        if not raw:
            return {**DEFAULT_STATE, 'session_id': self.session_id}
        data = json.loads(raw) if isinstance(raw, str) else raw
        data.setdefault('session_id', self.session_id)
        return data

    def save(self, data: dict) -> None:
        data['session_id'] = self.session_id
        cache.set(self.cache_key, json.dumps(data), self.ttl)

    def delete(self) -> None:
        cache.delete(self.cache_key)
