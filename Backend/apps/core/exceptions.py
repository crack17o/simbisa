import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('apps.core')


class SimbisaException(Exception):
    """Exception métier de base."""
    default_code = 'simbisa_error'
    default_message = "Une erreur inattendue s'est produite."
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, message=None, code=None, status_code=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        if status_code:
            self.status_code = status_code
        super().__init__(self.message)


class ScoringError(SimbisaException):
    default_code = 'scoring_error'
    default_message = 'Erreur lors du calcul du score de solvabilité.'


class InsufficientDataError(SimbisaException):
    default_code = 'insufficient_data'
    default_message = 'Données insuffisantes pour évaluer la solvabilité.'


class KYCNotValidatedError(SimbisaException):
    default_code = 'kyc_not_validated'
    default_message = 'Le KYC doit être validé avant de soumettre une demande.'
    status_code = status.HTTP_403_FORBIDDEN


class ActiveCreditExistsError(SimbisaException):
    default_code = 'active_credit_exists'
    default_message = 'Un crédit actif est déjà en cours pour cette devise.'


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, SimbisaException):
        return Response({
            'success': False,
            'error': {
                'code': exc.code,
                'message': exc.message,
            }
        }, status=exc.status_code)

    if response is not None:
        error_data = {
            'success': False,
            'error': {
                'code': 'validation_error' if response.status_code == 400 else 'error',
                'message': flatten_errors(response.data),
                'details': response.data,
            }
        }
        response.data = error_data

    return response


def flatten_errors(data):
    if isinstance(data, dict):
        errors = []
        for key, value in data.items():
            if isinstance(value, list):
                errors.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                errors.append(f"{key}: {value}")
        return ' | '.join(errors)
    if isinstance(data, list):
        return ', '.join(str(item) for item in data)
    return str(data)
