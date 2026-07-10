#!/bin/sh
# Build and validate an isolated ephemeral staging stack on localhost:18080.
set -eu
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
cd "$ROOT"
C="docker compose -p okoznaniy-staging -f docker-compose.staging.yml"
cleanup(){ [ "${KEEP_STAGING:-0}" = 1 ] || $C down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
$C down -v --remove-orphans >/dev/null 2>&1 || true
$C build --pull
$C up -d
# backend entrypoint migrates; wait for HTTP.
i=0
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/health || true)" = 200 ]; do
  i=$((i+1)); [ "$i" -lt 30 ] || { $C logs --tail=100; exit 1; }; sleep 3
done
$C exec -T backend python manage.py check
$C exec -T backend python manage.py makemigrations --check --dry-run
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/)
[ "$code" = 200 ]
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/api/shop/works/)
[ "$code" = 200 ]
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/admin/dashboard)
[ "$code" = 200 ]
$C exec -T backend python manage.py test apps.regression_tests --no-input -v 1
if [ "${KEEP_STAGING:-0}" = 1 ]; then echo 'STAGING_OK http://127.0.0.1:18080'; else echo 'STAGING_ACCEPTANCE_OK (stack removed)'; fi
