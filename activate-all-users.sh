#!/bin/bash

# Скрипт для активации всех неактивных пользователей

echo "🔄 Активация всех неактивных пользователей..."

# Проверяем, используется ли Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "📦 Обнаружен Docker, запускаем команду через Docker..."
    
    # Сначала показываем что будет сделано (dry-run)
    echo ""
    echo "📋 Предпросмотр (dry-run):"
    docker-compose exec backend python manage.py activate_all_users --dry-run
    
    echo ""
    read -p "Продолжить активацию? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose exec backend python manage.py activate_all_users
    else
        echo "❌ Отменено"
        exit 0
    fi
elif [ -d "venv" ]; then
    echo "🐍 Обнаружено виртуальное окружение, активируем..."
    source venv/bin/activate
    
    # Сначала показываем что будет сделано (dry-run)
    echo ""
    echo "📋 Предпросмотр (dry-run):"
    python manage.py activate_all_users --dry-run
    
    echo ""
    read -p "Продолжить активацию? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python manage.py activate_all_users
    else
        echo "❌ Отменено"
        exit 0
    fi
    deactivate
else
    echo "⚠️  Виртуальное окружение не найдено, пробуем python3..."
    
    # Сначала показываем что будет сделано (dry-run)
    echo ""
    echo "📋 Предпросмотр (dry-run):"
    python3 manage.py activate_all_users --dry-run
    
    echo ""
    read -p "Продолжить активацию? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 manage.py activate_all_users
    else
        echo "❌ Отменено"
        exit 0
    fi
fi

if [ $? -eq 0 ]; then
    echo "✅ Активация завершена успешно!"
else
    echo "❌ Ошибка при активации"
    exit 1
fi
