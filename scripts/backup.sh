#!/bin/sh
# Encrypted, deduplicated OkoZnaniy backup via Restic.
set -eu
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
CONF=${OKO_BACKUP_CONFIG:-/etc/okoznaniy-backup.env}
[ -r "$CONF" ] || { echo "Missing $CONF" >&2; exit 1; }
# shellcheck disable=SC1090
. "$CONF"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
STAGE=/var/lib/okoznaniy-backup/stage
LOCK=/run/okoznaniy-backup.lock
LOG=/var/log/okoznaniy-backup.log

if ! mkdir "$LOCK" 2>/dev/null; then echo "backup already running"; exit 0; fi
trap 'rm -rf "$STAGE"; rmdir "$LOCK"' EXIT INT TERM
mkdir -p "$STAGE/database" "$STAGE/config" "$STAGE/meta"
cd "$ROOT"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
log "backup started"

# Consistent compressed PostgreSQL custom-format dump. No service downtime.
docker compose exec -T postgres pg_dump -U postgres -d oko_db \
  --format=custom --compress=9 --no-owner --no-privileges > "$STAGE/database/oko_db.dump"
[ -s "$STAGE/database/oko_db.dump" ] || { log "ERROR empty database dump"; exit 1; }

# Small operational metadata useful during disaster recovery.
git rev-parse HEAD > "$STAGE/meta/git-head.txt" 2>/dev/null || true
docker compose config > "$STAGE/meta/compose.resolved.yml" 2>/dev/null || true
docker compose ps > "$STAGE/meta/containers.txt" 2>/dev/null || true
cp -a docker-compose.yml requirements.txt "$STAGE/config/" 2>/dev/null || true
cp -a docker/nginx "$STAGE/config/" 2>/dev/null || true
cp -a deploy/systemd "$STAGE/config/" 2>/dev/null || true
# Secrets are protected by Restic encryption; preserve for full recovery.
install -m 600 .env "$STAGE/config/app.env"

# Restic deduplicates media/config, so unchanged files consume almost no extra space.
restic backup \
  "$STAGE" \
  /var/lib/docker/volumes/okoznaniy_media_files/_data \
  /etc/letsencrypt \
  /etc/systemd/system/okoznaniy-monitor.service \
  /etc/systemd/system/okoznaniy-monitor.timer \
  --tag okoznaniy --tag production --host "$(hostname)" >> "$LOG" 2>&1

# GFS retention: 7 daily + 4 weekly + 6 monthly. Compact but useful.
restic forget --tag okoznaniy --keep-daily 7 --keep-weekly 4 --keep-monthly 6 >> "$LOG" 2>&1

# Fast integrity check each run; full data read is scheduled weekly.
restic check >> "$LOG" 2>&1
log "BACKUP_OK snapshot=$(restic snapshots --latest 1 --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["short_id"] if d else "none")')"
