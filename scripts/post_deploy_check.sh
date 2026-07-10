#!/bin/sh
# Post-deploy acceptance check for OkoZnaniy. Fails fast and returns non-zero.
set -eu
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
BASE_URL=${OKO_BASE_URL:-https://okoznaniy.ru}
cd "$ROOT"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "FAIL: $*"; exit 1; }

log "post-deploy check started"

# Wait for required containers (up to 90 seconds).
required="postgres redis backend celery frontend nginx max-bot"
i=0
while [ "$i" -lt 18 ]; do
  missing=""
  for svc in $required; do
    cid=$(docker compose ps -q "$svc" 2>/dev/null || true)
    [ -n "$cid" ] || { missing="$missing $svc(no-container)"; continue; }
    state=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)
    [ "$state" = running ] || missing="$missing $svc($state)"
  done
  [ -z "$missing" ] && break
  i=$((i+1)); sleep 5
done
[ -z "${missing:-}" ] || fail "containers not running:$missing"
log "containers: OK"

# Framework/schema checks.
docker compose exec -T backend python manage.py check >/tmp/oko-django-check.log 2>&1 || {
  cat /tmp/oko-django-check.log; fail "django check"; }
docker compose exec -T backend python manage.py makemigrations --check --dry-run >/tmp/oko-migrations-check.log 2>&1 || {
  cat /tmp/oko-migrations-check.log; fail "uncommitted model changes"; }
if docker compose exec -T backend python manage.py showmigrations 2>/dev/null | grep -q '^ \[ \]'; then
  fail "unapplied migrations"
fi
log "django/schema: OK"

check_code() {
  name=$1; url=$2; allowed=$3
  code=$(curl -ksS --connect-timeout 8 --max-time 20 -o /tmp/oko-http-body -w '%{http_code}' "$url" || echo 000)
  case " $allowed " in *" $code "*) log "$name: $code";; *)
    body=$(head -c 300 /tmp/oko-http-body 2>/dev/null || true)
    fail "$name returned $code ($body)";; esac
}

# Public SPA + API routes.
check_code home "$BASE_URL/" "200"
check_code login "$BASE_URL/login" "200"
check_code admin_spa "$BASE_URL/admin/dashboard" "200"
check_code wallet_router "$BASE_URL/api/wallet/" "200"
check_code shop "$BASE_URL/api/shop/works/" "200"
check_code vk_oauth "$BASE_URL/api/users/vkid/login/" "302"
check_code max_status "$BASE_URL/api/users/max_auth_status/postdeploy-probe/" "200"

# Authenticated admin/wallet checks. Mint a short-lived token internally;
# never store a production admin password in scripts.
TOKEN=$(docker compose exec -T backend python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); import django; django.setup(); from django.contrib.auth import get_user_model; from rest_framework_simplejwt.tokens import RefreshToken; U=get_user_model(); u=U.objects.filter(role='admin',is_active=True).first(); print(str(RefreshToken.for_user(u).access_token) if u else '')" 2>/dev/null | tail -1)
[ -n "$TOKEN" ] || fail "no active admin for authenticated smoke"
for spec in "admin_stats:/api/admin-panel/stats/" "wallet:/api/wallet/me/" "claims:/api/admin-panel/claims/"; do
  name=${spec%%:*}; path=${spec#*:}
  code=$(curl -ksS --max-time 20 -o /tmp/oko-auth-body -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "$BASE_URL$path" || echo 000)
  [ "$code" = 200 ] || fail "$name returned $code ($(head -c 300 /tmp/oko-auth-body))"
  log "$name: 200"
done

log "POST_DEPLOY_OK"
