from django.apps import AppConfig


class CorrespondenceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'correspondence'

    def ready(self):
        from .signals import connect_sidebar_counts_invalidation

        connect_sidebar_counts_invalidation()
