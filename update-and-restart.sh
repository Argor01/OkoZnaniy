#!/bin/bash

# Скрипт для обновления и перезапуска проекта
# Использование: ./update-and-restart.sh

# Увеличиваем таймаут для Docker Compose
export COMPOSE_HTTP_TIMEOUT=300

echo "🔄 Начинаем обновление проекта..."

# Получаем последние изменения из git
echo "📥 Получаем изменения из git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при получении изменений из git"
    exit 1
fi

# Останавливаем контейнеры
echo "🛑 Останавливаем контейнеры..."
docker-compose down

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при остановке контейнеров"
    exit 1
fi

# Устанавливаем npm зависимости (если package.json изменился)
if [ -f "frontend-react/package.json" ]; then
    echo "📦 Проверяем npm зависимости..."
    cd frontend-react
    npm install
    cd ..
fi

# Пересобираем контейнеры без кеша
echo "🔨 Пересобираем контейнеры..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при сборке контейнеров"
    exit 1
fi

# Запускаем контейнеры в фоновом режиме
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Ошибка при запуске контейнеров"
    exit 1
fi

# Убеждаемся что nginx и telegram-bot запущены
echo "🌐 Проверяем nginx и telegram-bot..."
docker-compose up -d nginx telegram-bot

# Ждем пока контейнеры запустятся
echo "⏳ Ожидание запуска контейнеров..."
sleep 10

# Исправляем права доступа
echo "🔧 Исправляем права доступа..."
docker-compose exec -T backend chown -R appuser:appuser /app/media /app/static 2>/dev/null || true
docker-compose exec -T backend chmod -R 755 /app/media /app/static 2>/dev/null || true

# Применяем миграции
echo "🗄️ Применяем миграции базы данных..."
docker-compose exec -T backend python manage.py migrate

if [ $? -ne 0 ]; then
    echo "⚠️ Предупреждение: Ошибка при применении миграций"
fi

# Собираем статические файлы
echo "📦 Собираем статические файлы..."
docker-compose exec -T backend python manage.py collectstatic --noinput 2>/dev/null || true

# Настраиваем Google OAuth
echo "🔐 Настраиваем Google OAuth..."
docker-compose exec -T backend python setup_google_oauth.py 2>/dev/null || true

# Заполняем справочники (если они пустые)
echo "📚 Проверяем справочники..."
docker-compose exec -T backend python populate_subjects_and_work_types.py 2>/dev/null || true

# Test accounts/data are forbidden in production. To seed a local dev
# environment, run them manually with DJANGO_ENV=development.

echo "✅ Проект успешно обновлен и перезапущен!"
echo "📊 Проверьте статус контейнеров: docker-compose ps"
echo "📝 Просмотр логов: docker-compose logs -f"
echo ""
echo "🧪 Тестовые аккаунты:"
echo "   👑 Администраторы:"
echo "      Директор: director@test.com / test123"
echo "      Партнер: partner@test.com / test123"
echo "      Админ: admin@test.com / test123"
echo "   👥 Пользователи:"
echo "      Клиенты: client1@test.com / test123, client2@test.com / test123"
echo "      Эксперты: expert1@test.com / test123, expert2@test.com / test123"

# Mandatory post-deploy acceptance gate. A failed deployment exits non-zero.
echo "Running post-deploy acceptance checks..."
if ! "$(dirname "$0")/scripts/post_deploy_check.sh" 2>/dev/null; then
    # scripts/deploy.sh lives one level deeper.
    if ! "$PWD/scripts/post_deploy_check.sh"; then
        echo "POST-DEPLOY CHECK FAILED. Inspect: journalctl -u okoznaniy-monitor.service"
        exit 1
    fi
fi
echo "Post-deploy checks passed."

