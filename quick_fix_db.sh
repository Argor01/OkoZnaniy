#!/bin/bash
# Быстрое исправление подключения к PostgreSQL

echo "🔧 Быстрое исправление PostgreSQL..."

# Устанавливаем стандартный пароль
NEW_PASSWORD="postgres123"

echo "1. Изменяем пароль в базе данных..."
docker-compose exec -T postgres psql -U postgres -c "ALTER USER postgres PASSWORD '$NEW_PASSWORD';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Пароль в БД изменен"
else
    echo "⚠️ Не удалось изменить пароль (возможно БД еще не готова)"
fi

echo ""
echo "2. Обновляем .env файл..."
if [ -f .env ]; then
    # Создаем резервную копию
    cp .env .env.backup
    
    # Обновляем пароль
    if grep -q "POSTGRES_PASSWORD=" .env; then
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env
        echo "✓ POSTGRES_PASSWORD обновлен в .env"
    else
        echo "POSTGRES_PASSWORD=$NEW_PASSWORD" >> .env
        echo "✓ POSTGRES_PASSWORD добавлен в .env"
    fi
    
    # Обновляем DATABASE_URL
    if grep -q "DATABASE_URL=" .env; then
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/oko_db|" .env
        echo "✓ DATABASE_URL обновлен в .env"
    else
        echo "DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/oko_db" >> .env
        echo "✓ DATABASE_URL добавлен в .env"
    fi
else
    echo "❌ Файл .env не найден!"
    exit 1
fi

echo ""
echo "3. Перезапускаем сервисы..."
docker-compose restart backend celery telegram-bot

echo ""
echo "4. Ждем 10 секунд..."
sleep 10

echo ""
echo "5. Применяем миграции..."
docker-compose exec -T backend python manage.py migrate

echo ""
echo "=========================================="
echo "✅ ГОТОВО!"
echo ""
echo "Новый пароль PostgreSQL: $NEW_PASSWORD"
echo "Резервная копия .env сохранена в .env.backup"
echo ""
echo "Проверьте статус: docker-compose ps"
echo "Проверьте логи: docker-compose logs -f backend"
echo "=========================================="
