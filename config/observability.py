"""Optional Sentry/GlitchTip-compatible observability.

Set SENTRY_DSN to enable. With no DSN the application remains fully functional
and the existing local watchdog/logging remains active.
"""
import os


def init_observability():
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT", os.getenv("DJANGO_ENV", "production")),
        release=os.getenv("APP_RELEASE") or os.getenv("GIT_COMMIT"),
        integrations=[DjangoIntegration(), CeleryIntegration(), RedisIntegration()],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.05")),
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.0")),
        send_default_pii=False,
        max_breadcrumbs=50,
    )
    return True
