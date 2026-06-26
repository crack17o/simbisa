import os
from datetime import timedelta
from pathlib import Path
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-insecure-change-me-in-production')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
    'django_celery_results',
]

LOCAL_APPS = [
    'apps.core',
    'apps.authentication',
    'apps.clients',
    'apps.wallets',
    'apps.savings',
    'apps.credits',
    'apps.scoring',
    'apps.rag',
    'apps.audit',
    'apps.ussd',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.AuditLogMiddleware',
    'apps.core.middleware.RequestIDMiddleware',
]

ROOT_URLCONF = 'config.urls'
AUTH_USER_MODEL = 'authentication.Utilisateur'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME', default='simbisa_db'),
        'USER': config('DB_USER', default='simbisa_user'),
        'PASSWORD': config('DB_PASSWORD', default='simbisa_dev_password'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='3306'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'TIMEOUT': 300,
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Kinshasa'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_MINUTES', default=30, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'apps.authentication.serializers.CustomTokenObtainPairSerializer',
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '200/minute',
        'auth': '10/minute',
        'scoring': '30/minute',
    },
}

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'origin', 'user-agent',
    'x-csrftoken', 'x-device-id', 'x-request-id',
]

SPECTACULAR_SETTINGS = {
    'TITLE': 'Simbisa FinTech API — Rawbank',
    'DESCRIPTION': 'Plateforme intelligente de micro-crédits avec scoring XAI et IA générative RAG.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SECURITY': [{'bearerAuth': []}],
    'COMPONENT_SPLIT_REQUEST': True,
}

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

LANGUAGE_CODE = 'fr-cd'
TIME_ZONE = 'Africa/Kinshasa'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'simbisa.log',
            'maxBytes': 1024 * 1024 * 50,
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {'handlers': ['console', 'file'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'WARNING', 'propagate': False},
        'apps': {'handlers': ['console', 'file'], 'level': 'DEBUG', 'propagate': False},
        'scoring': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
    },
}

ML_MODEL_PATH = config('ML_MODEL_PATH', default=str(BASE_DIR / 'mltraining' / 'models' / 'xgboost_v2.joblib'))
ML_SCALER_PATH = config('ML_SCALER_PATH', default=str(BASE_DIR / 'mltraining' / 'models' / 'scaler.joblib'))
ML_FEATURES_PATH = config('ML_FEATURES_PATH', default=str(BASE_DIR / 'mltraining' / 'models' / 'features.json'))

SCORING_WEIGHTS = {
    'regles': 0.25,
    'comportemental': 0.25,
    'mobile_money': 0.25,
    'ia': 0.25,
}

OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
OPENAI_MODEL = config('OPENAI_MODEL', default='gpt-4o-mini')
EMBEDDING_MODEL = config('EMBEDDING_MODEL', default='text-embedding-3-small')

# LLM & Embeddings (RAG) — provider : gemini | openai
LLM_PROVIDER = config('LLM_PROVIDER', default='gemini')
EMBEDDING_PROVIDER = config('EMBEDDING_PROVIDER', default='gemini')
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
GEMINI_MODEL = config('GEMINI_MODEL', default='gemini-2.0-flash')
GEMINI_EMBEDDING_MODEL = config('GEMINI_EMBEDDING_MODEL', default='models/text-embedding-004')

RAG_RETRIEVAL_K = config('RAG_RETRIEVAL_K', default=5, cast=int)
RAG_COLLECTION = config('RAG_COLLECTION', default='rawbank_policies')

# Taux indicatif (affichage / docs — les montants restent dans la devise demandée)
# Fallback si la table platform_config est indisponible (valeur initiale Rawbank)
CDF_PER_USD = config('CDF_PER_USD', default=2250, cast=int)

CREDIT_LIMITS = {
    'USD': {'min': 50, 'max': 1500},
    # CDF : min/max calculés dynamiquement via get_credit_limits() × cdf_per_usd
}

# Rétrocompatibilité (plages USD)
MIN_CREDIT_AMOUNT = CREDIT_LIMITS['USD']['min']
MAX_CREDIT_AMOUNT = CREDIT_LIMITS['USD']['max']
MIN_AGE = 20
MAX_AGE = 60
DEFAULT_INTEREST_RATE = 0.03

# USSD (passerelle simulée — pas de telco réel)
USSD_SESSION_TTL = config('USSD_SESSION_TTL', default=180, cast=int)
USSD_SIMULATOR_ENABLED = config('USSD_SIMULATOR_ENABLED', default=DEBUG, cast=bool)
USSD_DEFAULT_PIN = config('USSD_DEFAULT_PIN', default='0000')
USSD_CALLBACK_SECRET = config('USSD_CALLBACK_SECRET', default='simulator-dev-secret')
USSD_REQUIRE_SECRET = config('USSD_REQUIRE_SECRET', default=False, cast=bool)

CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY', default='')
CLOUDINARY_API_SECRET = config('CLOUDINARY_API_SECRET', default='')

# E-mail (Gmail : mot de passe d'application Google, pas le mot de passe du compte)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

_from_env = config('DEFAULT_FROM_EMAIL', default='')
if _from_env and 'votre@gmail.com' not in _from_env.lower():
    DEFAULT_FROM_EMAIL = _from_env
elif EMAIL_HOST_USER:
    DEFAULT_FROM_EMAIL = f'Simbisa Rawbank <{EMAIL_HOST_USER}>'
else:
    DEFAULT_FROM_EMAIL = 'Simbisa Rawbank <noreply@simbisa.cd>'

SIMBISA_OTP_VALIDITY_MINUTES = config('SIMBISA_OTP_VALIDITY_MINUTES', default=10, cast=int)

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
