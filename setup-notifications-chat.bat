@echo off
echo 🔧 Настройка системы уведомлений и чата...

REM Установка зависимостей frontend
echo 📦 Установка зависимостей frontend...
cd frontend-react
call npm install date-fns
cd ..

echo ✅ Зависимости установлены!
echo.
echo 📝 Следующие шаги:
echo 1. На сервере выполните: docker-compose exec backend python manage.py migrate chat
echo.
echo 2. Замените импорты в ExpertDashboard/index.tsx:
echo    import NotificationsModal from './modals/NotificationsModalNew';
echo    import MessageModal from './modals/MessageModalNew';
echo.
echo 3. Перезапустите frontend
echo.
echo 📖 Подробная документация: NOTIFICATIONS_AND_CHAT_INTEGRATION.md

pause
