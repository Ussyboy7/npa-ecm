from django.apps import AppConfig


class EcmCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ecm_core'
    verbose_name = 'ECM Core'
    
    def ready(self):
        import ecm_core.signals  # noqa


