import uuid
import json
import logging
import threading
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('apps.core')
_thread_local = threading.local()


def get_current_request():
    return getattr(_thread_local, 'request', None)


class RequestIDMiddleware(MiddlewareMixin):
    """Injecte un ID unique dans chaque requête pour la traçabilité."""

    def process_request(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4()))
        request.request_id = request_id
        _thread_local.request = request

    def process_response(self, request, response):
        response['X-Request-ID'] = getattr(request, 'request_id', '')
        return response


class AuditLogMiddleware(MiddlewareMixin):
    """Journalise automatiquement les actions sensibles (écriture)."""
    SENSITIVE_PATHS = [
        '/api/v1/credits/',
        '/api/v1/scoring/',
        '/api/v1/clients/',
        '/api/v1/auth/',
    ]
    WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

    def process_response(self, request, response):
        if request.method not in self.WRITE_METHODS:
            return response
        if not any(request.path.startswith(p) for p in self.SENSITIVE_PATHS):
            return response
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response

        from apps.audit.models import AuditLog
        try:
            body = {}
            content_type = request.content_type or ''
            if 'application/json' in content_type:
                try:
                    body = json.loads(request.body.decode('utf-8'))
                    for field in ('mot_de_passe', 'password', 'token', 'otp'):
                        if field in body:
                            body[field] = '***'
                except Exception:
                    pass

            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '')

            AuditLog.objects.create(
                id_utilisateur=request.user,
                action=f"{request.method}:{request.path}",
                details=json.dumps({
                    'status_code': response.status_code,
                    'body_keys': list(body.keys()) if body else [],
                    'request_id': getattr(request, 'request_id', ''),
                }),
                adresse_ip=ip[:45],
            )
        except Exception as e:
            logger.error(f"AuditLog middleware error: {e}", exc_info=True)

        return response
