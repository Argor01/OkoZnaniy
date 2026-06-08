from django.apps import AppConfig


class WalletConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.wallet'
    verbose_name = 'Кошельки и баланс'

    def ready(self):
        # Connect signal handlers for auto top-up on successful payment.
        from . import signals  # noqa: F401
