#!/bin/sh
# Usage:
#   restore.sh list
#   restore.sh extract [snapshot|latest] [target-dir]
#   restore.sh database [snapshot|latest]   (interactive destructive restore)
set -eu
CONF=${OKO_BACKUP_CONFIG:-/etc/okoznaniy-backup.env}
. "$CONF"
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
cmd=${1:-help}; snapshot=${2:-latest}; target=${3:-/var/restore/okoznaniy-$snapshot}
case "$cmd" in
 list)
   restic snapshots --tag okoznaniy
   ;;
 extract)
   mkdir -p "$target"
   restic restore "$snapshot" --target "$target"
   echo "Restored to $target"
   ;;
 database)
   tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT INT TERM
   restic restore "$snapshot" --target "$tmp" --include '/stage/database/oko_db.dump'
   dump=$(find "$tmp" -name oko_db.dump -type f | head -1)
   [ -s "$dump" ] || { echo 'Database dump not found' >&2; exit 1; }
   echo "WARNING: this replaces the production oko_db database from snapshot $snapshot."
   printf "Type RESTORE to continue: "; read answer
   [ "$answer" = RESTORE ] || { echo 'Cancelled'; exit 1; }
   cd /root/OkoZnaniy
   docker compose stop backend celery
   docker compose exec -T postgres dropdb -U postgres --if-exists oko_db
   docker compose exec -T postgres createdb -U postgres oko_db
   cat "$dump" | docker compose exec -T postgres pg_restore -U postgres -d oko_db --no-owner --no-privileges
   docker compose up -d backend celery
   ./scripts/post_deploy_check.sh
   echo 'Database restore complete.'
   ;;
 *)
   echo "Usage: $0 {list|extract [snapshot] [target]|database [snapshot]}"; exit 2;;
esac
