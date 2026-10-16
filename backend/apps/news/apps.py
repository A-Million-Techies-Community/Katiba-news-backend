"""Register the news feature with Django and set the admin display name."""
from django.apps import AppConfig


class NewsConfig(AppConfig):
    """Configure the news app and its name in Django admin."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.news'
    verbose_name = 'News sourcing'
