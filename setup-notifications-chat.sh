#!/bin/bash

echo "🔧 Настройка системы уведомлений и чата..."

# Установка зависимостей frontend
echo "📦 Установка зависимостей frontend..."
cd frontend-react
npm install date-fns
cd ..

# Применение миграций
echo "🗄️ Применение миграций..."
python manage.py migrate chat

# Создание тестовых данных
echo "🧪 Создание тестовых данных..."
python manage.py shell << EOF
from apps.users.models import User
from apps.notifications.services import NotificationService

# Создаем тестовые уведомления для первого пользователя
user = User.objects.first()
if user:
    NotificationService.create_notification(
        recipient=user,
        notification_type='new_order',
        title='Добро пожаловать!',
        message='Система уведомлений успешно настроена и работает.'
    )
    print(f"✅ Создано тестовое уведомление для пользователя {user.username}")
else:
    print("⚠️ Пользователи не найдены. Создайте пользователя сначала.")
EOF

echo "✅ Настройка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Замените импорты в ExpertDashboard/index.tsx:"
echo "   import NotificationsModal from './modals/NotificationsModalNew';"
echo "   import MessageModal from './modals/MessageModalNew';"
echo ""
echo "2. Перезапустите frontend: npm run dev"
echo ""
echo "3. Проверьте работу уведомлений и чата в браузере"
echo ""
echo "📖 Подробная документация: NOTIFICATIONS_AND_CHAT_INTEGRATION.md"
