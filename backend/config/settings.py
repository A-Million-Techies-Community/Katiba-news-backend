"""Settings for the Katiba News backend."""
from datetime import timedelta
from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'local-development-only-change-before-hosting-892374982374982374')
ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')
if ENVIRONMENT not in ('development', 'production', 'test'):
    raise ValueError('DJANGO_ENV must be development, production, or test')
PRODUCTION = ENVIRONMENT == 'production'
DEBUG = not PRODUCTION
if PRODUCTION:
    from django.core.exceptions import ImproperlyConfigured
    if not os.environ.get('DJANGO_SECRET_KEY') or len(SECRET_KEY) < 50 or SECRET_KEY.startswith('local-development'):
        raise ImproperlyConfigured('Set a private DJANGO_SECRET_KEY of at least 50 characters.')
    if not os.environ.get('ALLOWED_HOSTS'):
        raise ImproperlyConfigured('Set explicit production ALLOWED_HOSTS.')
    if not os.environ.get('DATABASE_URL'):
        raise ImproperlyConfigured('Production requires an explicit DATABASE_URL.')
    if '*' in os.environ.get('ALLOWED_HOSTS', ''):
        raise ImproperlyConfigured('Wildcard production hosts are not permitted.')
    if not os.environ.get('REDIS_URL'):
        raise ImproperlyConfigured('Production requires REDIS_URL for shared rate limits.')
SECURE_SSL_REDIRECT = PRODUCTION
SESSION_COOKIE_SECURE = PRODUCTION
CSRF_COOKIE_SECURE = PRODUCTION
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 3600 if PRODUCTION else 0
# Opt in only after every subdomain has HTTPS; preload has long-lived effects.
SECURE_HSTS_INCLUDE_SUBDOMAINS = PRODUCTION and os.environ.get('HSTS_SUBDOMAINS') == 'true'
SECURE_HSTS_PRELOAD = PRODUCTION and os.environ.get('HSTS_PRELOAD') == 'true'
SECURE_REFERRER_POLICY = 'same-origin'
CSRF_TRUSTED_ORIGINS = ['https://katibanews.co.ke'] if PRODUCTION else []
# Enable only behind a proxy that strips client-supplied forwarded headers.
if os.environ.get('TRUST_HTTPS_PROXY') == 'true':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CACHES = {'default': {
    'BACKEND': 'django.core.cache.backends.redis.RedisCache' if PRODUCTION else 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': os.environ.get('REDIS_URL', 'katiba-local'),
}}
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 100
DATA_UPLOAD_MAX_NUMBER_FILES = 4
FILE_UPLOAD_HANDLERS = ['config.uploads.LimitedUploadHandler', 'django.core.files.uploadhandler.MemoryFileUploadHandler', 'django.core.files.uploadhandler.TemporaryFileUploadHandler']
ALLOWED_HOSTS = [
    host.strip() for host in os.environ.get(
        'ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]'
    ).split(',') if host.strip()
]
PUBLIC_SITE_URL = os.environ.get('PUBLIC_SITE_URL', 'https://katibanews.co.ke' if PRODUCTION else 'http://127.0.0.1:5173').rstrip('/')
NEWS_UPLOAD_ROOT = BASE_DIR / 'news_uploads'


INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'rest_framework', 'rest_framework_simplejwt.token_blacklist',
    'apps.users.apps.UsersConfig', 'apps.news.apps.NewsConfig',
    # Register your streamlined modules so Django can discover their data schemas
    "apps.articles",
    "apps.blogs",
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'config.security.SecurityLimitsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [],
              'APP_DIRS': True, 'OPTIONS': {'context_processors': [
                  'django.template.context_processors.request',
                  'django.contrib.auth.context_processors.auth',
                  'django.contrib.messages.context_processors.messages',
              ]}}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'
DATABASES = {'default': dj_database_url.config(
    default='postgresql://katiba_news@127.0.0.1:5432/katiba_news',
    conn_max_age=60,
    conn_health_checks=True,
)}
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Added Media settings for handling image uploads
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'users.User'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('apps.users.authentication.VersionedJWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_THROTTLE_CLASSES': ('rest_framework.throttling.AnonRateThrottle', 'rest_framework.throttling.UserRateThrottle'),
    'DEFAULT_THROTTLE_RATES': {'staff_application': '5/hour', 'password_recovery': '10/hour', 'anon': '120/hour', 'user': '1000/hour'},
}
SIMPLE_JWT = {
    'TOKEN_OBTAIN_SERIALIZER': 'apps.users.authentication.LoginSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'apps.users.authentication.RefreshSerializer',
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'CHECK_REVOKE_TOKEN': True,
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
}
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend' if PRODUCTION else 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587' if PRODUCTION else '25'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = PRODUCTION
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@katibanews.co.ke' if PRODUCTION else 'no-reply@localhost')
PASSWORD_RESET_TIMEOUT = 3600
