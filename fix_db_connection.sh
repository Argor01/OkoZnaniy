#!/bin/bash
# Скрипт для диагностики и исправления подключения к PostgreSQL

echo "🔍 Диагностика подключения к PostgreSQL..."
echo "=========================================="

# Проверяем .env файл
echo ""
echo "1. Проверка .env файла:"
if [ -f .env ]; then
    echo "✓ Файл .env существует"
    echo "Текущий POSTGRES_PASSWORD:"
    grep "POSTGRES_PASSWORD" .env || echo "⚠️ POSTGRES_PASSWORD не найден в .env"
else
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл на основе .env.example"
    exit 1
fi

# Проверяем статус контейнеров
echo ""
echo "2. Статус контейнеров:"
docker-compose ps

# Проверяем логи postgres
echo ""
echo "3. Последние логи PostgreSQL:"
docker-compose logs --tail=20 postgres

# Проверяем логи backend
echo ""
echo "4. Последние логи Backend:"
docker-compose logs --tail=20 backend

echo ""
echo "=========================================="
echo "🔧 ВАРИАНТЫ РЕШЕНИЯ:"
echo ""
echo "ВАРИАНТ 1: Сбросить пароль PostgreSQL"
echo "  docker-compose exec postgres psql -U postgres -c \"ALTER USER postgres PASSWORD 'postgres123';\""
echo "  Затем обновите POSTGRES_PASSWORD=postgres123 в .env"
echo "  docker-compose restart backend celery telegram-bot"
echo ""
echo "ВАРИАНТ 2: Пересоздать базу данных (УДАЛИТ ВСЕ ДАННЫЕ!)"
echo "  docker-compose down -v"
echo "  Убедитесь что POSTGRES_PASSWORD в .env установлен"
echo "  docker-compose up -d"
echo ""
echo "ВАРИАНТ 3: Использовать существующий скрипт"
echo "  ./fix_postgres_password.sh"
echo ""
