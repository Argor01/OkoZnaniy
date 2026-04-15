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

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Daphne (ASGI server with WebSocket support)
echo "Starting Daphne (ASGI server)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
