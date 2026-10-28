"""Portable isolated security tests; PostgreSQL remains the runtime database."""
from .settings import *
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'security-tests'}}
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
