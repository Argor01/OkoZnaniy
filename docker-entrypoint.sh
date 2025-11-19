#!/bin/sh

# РћР¶РёРґР°РЅРёРµ РіРѕС‚РѕРІРЅРѕСЃС‚Рё Р±Р°Р·С‹ РґР°РЅРЅС‹С…
echo "Waiting for database..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Р’С‹РїРѕР»РЅРµРЅРёРµ РјРёРіСЂР°С†РёР№
echo "Running migrations..."
python manage.py migrate --noinput

# РЎР±РѕСЂ СЃС‚Р°С‚РёС‡РµСЃРєРёС… С„Р°Р№Р»РѕРІ
echo "Collecting static files..."
python manage.py collectstatic --noinput

# РЎРѕР·РґР°РЅРёРµ СЃСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РµСЃР»Рё РЅРµ СЃСѓС‰РµСЃС‚РІСѓРµС‚
echo "Creating superuser if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Р—Р°РїСѓСЃРє РїСЂРёР»РѕР¶РµРЅРёСЏ
if [ "$DJANGO_ENV" = "development" ]; then
    echo "Starting development server..."
    python manage.py runserver 0.0.0.0:8000
else
    echo "Starting production server..."
    gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi