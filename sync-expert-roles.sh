#!/bin/bash

# Скрипт для синхронизации ролей экспертов с одобренными анкетами

echo "🔄 Синхронизация ролей экспертов..."

# Проверяем, используется ли Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "📦 Обнаружен Docker, запускаем команду через Docker..."
    docker-compose exec backend python manage.py sync_expert_roles
elif [ -d "venv" ]; then
    echo "🐍 Обнаружено виртуальное окружение, активируем..."
    source venv/bin/activate
    python manage.py sync_expert_roles
    deactivate
else
    echo "⚠️  Виртуальное окружение не найдено, пробуем python3..."
    python3 manage.py sync_expert_roles
fi

if [ $? -eq 0 ]; then
    echo "✅ Синхронизация завершена успешно!"
else
    echo "❌ Ошибка при синхронизации"
    exit 1
fi
