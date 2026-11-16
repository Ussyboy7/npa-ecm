from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Importing registers the cookie authenticator with drf-spectacular.
        from . import schema  # noqa: F401
