# OkoZnaniy backups

Encrypted/deduplicated backups use Restic and run daily via systemd.

## Commands

```bash
oko-backup              # run now
oko-backup-check        # verify freshness
oko-restore list        # list snapshots
oko-restore extract latest /var/restore/check
oko-restore database latest  # interactive production DB restore
```

## Schedule and retention

- Daily around 02:20 UTC (random delay up to 15 minutes)
- Keep 7 daily, 4 weekly and 6 monthly snapshots
- Weekly 10% deep repository read/integrity check
- Backup freshness is checked by the 2-minute production watchdog

## Included

PostgreSQL custom-format dump, uploaded media, `.env`, resolved Compose config,
nginx configuration, systemd monitoring units and Let's Encrypt certificates.
The Git repository remains the source of application code.

## Local paths

- Repository: `/var/backups/okoznaniy-restic`
- Password: `/etc/okoznaniy-backup/password` (mode 600)
- Config: `/etc/okoznaniy-backup.env` (mode 600)
- Log: `/var/log/okoznaniy-backup.log`

For server-loss protection, change `RESTIC_REPOSITORY` to an S3/B2/Storage Box
repository (or configure a second off-site copy) once storage credentials exist.
Never commit the password file.
