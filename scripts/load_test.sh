#!/bin/sh
set -eu
ROOT=${OKO_ROOT:-/root/OkoZnaniy}
BASE_URL=${BASE_URL:-https://okoznaniy.ru}
RATE=${RATE:-2}
DURATION=${DURATION:-30s}
cd "$ROOT"
# Mint a short-lived token internally; no password or production account required.
TOKEN=$(docker compose exec -T backend python manage.py shell -c "from django.contrib.auth import get_user_model; from rest_framework_simplejwt.tokens import AccessToken; U=get_user_model(); u=U.objects.filter(is_active=True).first(); print(str(AccessToken.for_user(u)))" 2>/dev/null | tail -1)
[ -n "$TOKEN" ] || { echo 'Could not mint load-test token' >&2; exit 1; }
docker run --rm --network host \
  -e BASE_URL="$BASE_URL" -e RATE="$RATE" -e DURATION="$DURATION" -e TOKEN="$TOKEN" \
  -v "$ROOT/tests/load:/scripts:ro" \
  grafana/k6:latest run /scripts/smoke.js
