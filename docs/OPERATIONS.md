# Operations toolkit

## Auth security

Browser JWTs use Secure, HttpOnly, SameSite=Strict cookies. OAuth redirects use
a 90-second one-time exchange code, never JWT query parameters.

## Error tracking

Backend and frontend are Sentry/GlitchTip compatible. Set `SENTRY_DSN` in the
server `.env` and `VITE_SENTRY_DSN` during frontend build to enable hosted error
tracking. Without a DSN the local watchdog and structured container logs remain active.

## Staging and CI/CD

```bash
./scripts/staging_deploy.sh        # isolated ephemeral acceptance stack
KEEP_STAGING=1 ./scripts/staging_deploy.sh  # keep on 127.0.0.1:18080
```

GitHub workflow `.github/workflows/deploy.yml` requires repository/environment
secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. Configure a required
reviewer on the `production` environment for manual promotion after staging.

## Load testing

```bash
RATE=2 DURATION=30s ./scripts/load_test.sh
```

The k6 profile mints a short-lived token internally, uses no stored password and
fails on >1% errors, p95 >800ms or p99 >1500ms.

## Restore drill

`okoznaniy-restore-drill.timer` restores the latest backup into a temporary
PostgreSQL database on the first day of every month, checks migrations/users and
drops the temporary database. Production is never modified.

## Backups

See `docs/BACKUPS.md` and commands `oko-backup`, `oko-backup-check`, `oko-restore`.
