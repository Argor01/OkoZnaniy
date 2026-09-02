#!/usr/bin/env bash
set -euo pipefail

# Idempotently create the demo profiles used for manual UI/API checks.
docker compose exec -T backend python manage.py seed_demo_profiles
