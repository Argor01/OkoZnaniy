"""Sync SocialApp records (Google, VK) from environment variables.

Run after deploy / env changes:
    python manage.py setup_social_apps

Reads:
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    VK_CLIENT_ID, VK_CLIENT_SECRET, VK_SERVICE_KEY
"""
import os

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update SocialApp rows for OAuth providers from env vars."

    def handle(self, *args, **options):
        site = Site.objects.get_current()
        created, updated, skipped = [], [], []

        providers = [
            {
                "provider": "google",
                "name": "Google",
                "client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip(),
                "secret": os.getenv("GOOGLE_CLIENT_SECRET", "").strip(),
                "key": "",
            },
            {
                "provider": "vk",
                "name": "VK",
                "client_id": os.getenv("VK_CLIENT_ID", "").strip(),
                "secret": os.getenv("VK_CLIENT_SECRET", "").strip(),
                "key": os.getenv("VK_SERVICE_KEY", "").strip(),
            },
        ]

        for cfg in providers:
            if not cfg["client_id"] or not cfg["secret"]:
                skipped.append(cfg["provider"])
                self.stdout.write(
                    self.style.WARNING(
                        f"  ! {cfg['provider']}: skipped (env vars empty)"
                    )
                )
                continue

            qs = SocialApp.objects.filter(provider=cfg["provider"])
            if qs.exists():
                app = qs.first()
                changed = False
                for attr in ("name", "client_id", "secret", "key"):
                    if getattr(app, attr) != cfg[attr]:
                        setattr(app, attr, cfg[attr])
                        changed = True
                if changed:
                    app.save()
                    updated.append(cfg["provider"])
                # remove duplicates if any
                qs.exclude(pk=app.pk).delete()
            else:
                app = SocialApp.objects.create(
                    provider=cfg["provider"],
                    name=cfg["name"],
                    client_id=cfg["client_id"],
                    secret=cfg["secret"],
                    key=cfg["key"],
                )
                created.append(cfg["provider"])

            if site not in app.sites.all():
                app.sites.add(site)

        self.stdout.write(self.style.SUCCESS("SocialApp sync done."))
        if created:
            self.stdout.write(f"  created: {', '.join(created)}")
        if updated:
            self.stdout.write(f"  updated: {', '.join(updated)}")
        if skipped:
            self.stdout.write(f"  skipped (no creds): {', '.join(skipped)}")
