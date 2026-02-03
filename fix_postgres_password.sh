#!/bin/bash
# Скрипт для исправления пароля PostgreSQL

echo "🔧 Исправление пароля PostgreSQL..."

# Изменяем пароль
cat > /tmp/fix_pg.sql << 'EOF'
ALTER USER postgres PASSWORD 'postgres123';
EOF

COMPOSE_HTTP_TIMEOUT=300 docker-compose exec -T postgres psql -U postgres -f - < /tmp/fix_pg.sql

if [ $? -eq 0 ]; then
    echo "✅ Пароль PostgreSQL успешно изменен"
    
    # Перезапускаем backend и celery
    echo "🔄 Перезапуск backend и celery..."
    COMPOSE_HTTP_TIMEOUT=300 docker-compose restart backend celery
    
    echo "✅ Готово!"
else
    echo "❌ Ошибка при изменении пароля"
    exit 1
fi
