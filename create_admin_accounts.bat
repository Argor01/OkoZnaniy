@echo off
REM Скрипт для создания тестовых аккаунтов администраторов
REM Создает аккаунты директора, партнера и администратора

echo Создание тестовых аккаунтов администраторов...
echo Убедитесь, что база данных запущена (docker-compose up postgres -d)
echo.

REM Проверяем, что мы в правильной директории
if not exist "manage.py" (
    echo ❌ Ошибка: файл manage.py не найден!
    echo Запустите скрипт из корневой директории проекта Django
    pause
    exit /b 1
)

REM Запускаем Django management команду
echo Запуск создания пользователей через Django...
python manage.py create_admin_accounts

echo.
echo Скрипт завершен!
echo.
echo Для запуска проекта используйте:
echo   docker-compose -f docker-compose.dev.yml up
echo.
echo Или для запуска только базы данных:
echo   docker-compose -f docker-compose.dev.yml up postgres redis -d
echo.
pause