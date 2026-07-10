#!/bin/sh
# Lightweight production watchdog. Runs from a systemd timer every 2 minutes.
set -u
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
BASE_URL=${OKO_BASE_URL:-https://okoznaniy.ru}
STATE_DIR=/var/lib/okoznaniy-monitor
LOG=/var/log/okoznaniy-monitor.log
LOCK=/run/okoznaniy-monitor.lock
mkdir -p "$STATE_DIR"

# Avoid overlapping timer runs.
if ! mkdir "$LOCK" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK"' EXIT INT TERM
cd "$ROOT" || exit 1

log() { line="$(date -u +%FT%TZ) $*"; echo "$line" >> "$LOG"; logger -t okoznaniy-monitor -- "$*"; }

probe() {
  curl -ksS --connect-timeout 5 --max-time 12 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null || echo 000
}

failures=""
for svc in postgres redis backend celery frontend nginx max-bot; do
  cid=$(docker compose ps -q "$svc" 2>/dev/null || true)
  if [ -z "$cid" ]; then failures="$failures $svc:missing"; continue; fi
  state=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)
  [ "$state" = running ] || failures="$failures $svc:$state"
done

home=$(probe "$BASE_URL/")
api=$(probe "$BASE_URL/api/shop/works/")
admin=$(probe "$BASE_URL/admin/dashboard")
wallet=$(probe "$BASE_URL/api/wallet/")
backup_status=$(/root/OkoZnaniy/scripts/backup_check.sh 2>/dev/null || true)
[ "${backup_status#OK }" != "$backup_status" ] || failures="$failures backup:${backup_status:-missing}"
[ "$home" = 200 ] || failures="$failures home:$home"
[ "$api" = 200 ] || failures="$failures api:$api"
[ "$admin" = 200 ] || failures="$failures admin:$admin"
[ "$wallet" = 200 ] || failures="$failures wallet:$wallet"

if [ -z "$failures" ]; then
  rm -f "$STATE_DIR/failing"
  # Keep log compact: one healthy line per hour, not every 2 minutes.
  hour=$(date -u +%Y%m%d%H)
  if [ ! -f "$STATE_DIR/healthy-$hour" ]; then
    rm -f "$STATE_DIR"/healthy-* 2>/dev/null || true
    touch "$STATE_DIR/healthy-$hour"
    log "OK home=$home api=$api admin=$admin wallet=$wallet $backup_status"
  fi
  exit 0
fi

log "FAIL$failures; attempting recovery"
touch "$STATE_DIR/failing"

# Recovery: recreate missing/stopped required services and reload nginx DNS state.
docker compose up -d postgres redis backend celery frontend nginx max-bot >> "$LOG" 2>&1 || true
docker compose restart nginx >> "$LOG" 2>&1 || true
sleep 12

home2=$(probe "$BASE_URL/"); api2=$(probe "$BASE_URL/api/shop/works/"); admin2=$(probe "$BASE_URL/admin/dashboard")
if [ "$home2" = 200 ] && [ "$api2" = 200 ] && [ "$admin2" = 200 ]; then
  rm -f "$STATE_DIR/failing"
  log "RECOVERED home=$home2 api=$api2 admin=$admin2"
  exit 0
fi

log "CRITICAL recovery failed home=$home2 api=$api2 admin=$admin2"
exit 1
