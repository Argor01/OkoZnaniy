#!/bin/bash
# Runs on EVERY postgres container start via docker-compose command override.
# Starts postgres normally, waits for it, then ensures password matches env.
set -e

# Start postgres in background using the original entrypoint
docker-entrypoint.sh postgres "$@" &
PG_PID=$!

# Wait until postgres is ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; do
  sleep 1
done

# Sync password from env (idempotent - safe to run every time)
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';" > /dev/null 2>&1
echo "[postgres] Password synchronized from POSTGRES_PASSWORD env"

# Hand off to the background postgres process
wait $PG_PID
