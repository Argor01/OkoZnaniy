#!/bin/sh
set -eu
. /etc/okoznaniy-backup.env
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
max_age=${BACKUP_MAX_AGE_SECONDS:-93600}
latest=$(restic snapshots --tag okoznaniy --latest 1 --json)
count=$(printf '%s' "$latest" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
[ "$count" -gt 0 ] || { echo 'CRITICAL no backup snapshots'; exit 2; }
age=$(printf '%s' "$latest" | python3 -c 'import json,sys,datetime; d=json.load(sys.stdin)[0]; t=datetime.datetime.fromisoformat(d["time"].replace("Z","+00:00")); print(int((datetime.datetime.now(datetime.timezone.utc)-t).total_seconds()))')
id=$(printf '%s' "$latest" | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["short_id"])')
[ "$age" -le "$max_age" ] || { echo "CRITICAL backup $id age=${age}s"; exit 2; }
echo "OK backup=$id age=${age}s"
