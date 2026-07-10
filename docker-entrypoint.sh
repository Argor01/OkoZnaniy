#!/bin/sh

# Wait for postgres
echo "Waiting for postgres..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Wait for redis
echo "Waiting for redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Create test users (idempotent — safe to run on every start)
echo "Ensuring test users exist..."
if [ "${CREATE_TEST_USERS:-0}" = "1" ] && [ "${DJANGO_ENV:-production}" != "production" ]; then
  python manage.py create_test_users || echo "Warning: could not create test users"
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Honour a Compose command (for example the Celery worker). The backend
# service has no explicit command and therefore falls back to Daphne.
if [ "$#" -gt 0 ]; then
  echo "Starting custom service: $*"
  exec "$@"
fi

echo "Starting Daphne (ASGI server)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
