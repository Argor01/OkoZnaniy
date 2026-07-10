#!/bin/sh
# Restore latest backup into a temporary database and run sanity checks.
set -eu
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
. /etc/okoznaniy-backup.env
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
TMP=$(mktemp -d)
DB="oko_restore_drill_$(date -u +%Y%m%d%H%M%S)"
LOG=/var/log/okoznaniy-restore-drill.log
cleanup(){
  cd "$ROOT" 2>/dev/null || true
  docker compose exec -T postgres dropdb -U postgres --if-exists "$DB" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
cd "$ROOT"
log "restore drill started db=$DB"
restic restore latest --target "$TMP" --include '/var/lib/okoznaniy-backup/stage/database/oko_db.dump' >>"$LOG" 2>&1
dump=$(find "$TMP" -name oko_db.dump -type f | sed -n '1p')
[ -s "$dump" ] || { log 'FAIL dump missing'; exit 1; }
docker compose exec -T postgres createdb -U postgres "$DB"
cat "$dump" | docker compose exec -T postgres pg_restore -U postgres -d "$DB" --no-owner --no-privileges
# Sanity: core tables exist and migrations/users can be read.
migrations=$(docker compose exec -T postgres psql -U postgres -d "$DB" -Atc 'select count(*) from django_migrations;')
users=$(docker compose exec -T postgres psql -U postgres -d "$DB" -Atc 'select count(*) from users_user;')
[ "$migrations" -gt 0 ]
[ "$users" -ge 0 ]
log "RESTORE_DRILL_OK migrations=$migrations users=$users"
