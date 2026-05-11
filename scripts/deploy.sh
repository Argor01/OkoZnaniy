#!/bin/bash
# OkoZnaniy — безопасный деплой с автоматическими тестами
# Использование: ./scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."

echo "=== OkoZnaniy Safe Deploy ==="
echo ""

# 1. Тесты перед деплоем
echo ">>> Шаг 1: Запуск тестов..."
docker compose exec -T backend python manage.py test apps.regression_tests --no-input -v 1 2>&1
if [ $? -ne 0 ]; then
    echo "ТЕСТЫ ПРОВАЛЕНЫ! Деплой отменён."
    exit 1
fi
echo "Тесты пройдены."
echo ""

# 2. Пересборка бэкенда
echo ">>> Шаг 2: Перезапуск бэкенда..."
docker compose restart backend
sleep 3

# Копируем обновлённые файлы в контейнер
echo ">>> Копирование обновлённых файлов..."
for f in $(find apps/ config/ -name "*.py" -newer .last_deploy 2>/dev/null); do
    docker cp "$f" "okoznaniy-backend-1:/app/$f" 2>/dev/null && echo "  copied: $f"
done
docker exec -u root okoznaniy-backend-1 chown -R appuser:appuser /app/ 2>/dev/null

# 3. Миграции
echo ">>> Шаг 3: Миграции..."
docker compose exec -T backend python manage.py migrate --no-input 2>&1

# 4. Пересборка фронтенда (если есть изменения)
FRONTEND_CHANGED=$(find frontend-react/src -newer .last_deploy -name "*.tsx" -o -name "*.ts" -o -name "*.css" 2>/dev/null | head -1)
if [ -n "$FRONTEND_CHANGED" ]; then
    echo ">>> Шаг 4: Пересборка фронтенда..."
    docker compose build --no-cache frontend 2>&1 | tail -5
    docker compose up -d frontend
else
    echo ">>> Шаг 4: Фронтенд без изменений, пропускаем."
fi

# 5. Повторный прогон тестов после деплоя
echo ""
echo ">>> Шаг 5: Пост-деплой тесты..."
sleep 3
docker compose exec -T backend python manage.py test apps.regression_tests --no-input -v 0 2>&1
if [ $? -ne 0 ]; then
    echo "ПОСТ-ДЕПЛОЙ ТЕСТЫ ПРОВАЛЕНЫ!"
    exit 1
fi

# Обновляем timestamp
touch .last_deploy

echo ""
echo "=== ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО ==="
echo "Backend: $(docker compose ps backend --format {{.Status}})"
echo "Frontend: $(docker compose ps frontend --format {{.Status}})"
