#!/bin/bash

# Скрипт для проверки настроек на хостинге

echo "🔍 Проверка настроек хостинга..."
echo ""

echo "1️⃣ Проверка .env файла:"
echo "FRONTEND_URL:"
grep FRONTEND_URL .env || echo "❌ FRONTEND_URL не найден!"
echo ""

echo "2️⃣ Проверка переменных окружения в backend:"
docker-compose exec backend env | grep FRONTEND_URL || echo "❌ FRONTEND_URL не установлен в контейнере!"
echo ""

echo "3️⃣ Проверка статуса контейнеров:"
docker-compose ps
echo ""

echo "4️⃣ Проверка логов backend (последние 10 строк):"
docker-compose logs backend | tail -10
echo ""

echo "5️⃣ Проверка CORS настроек:"
docker-compose exec backend python manage.py shell -c "from django.conf import settings; print('CORS_ALLOWED_ORIGINS:', settings.CORS_ALLOWED_ORIGINS)"
echo ""

echo "✅ Проверка завершена!"
echo ""
echo "📝 Если FRONTEND_URL не равен http://45.12.239.226:"
echo "   1. Исправьте .env файл"
echo "   2. Выполните: docker-compose restart backend"
