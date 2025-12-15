@echo off
echo ========================================
echo Настройка чата и уведомлений
echo ========================================
echo.

REM Проверяем, запущен ли Docker
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo Обнаружен Docker. Используем Docker...
    echo.
    
    echo [1/3] Создание миграций для чата...
    docker-compose exec -T web python manage.py makemigrations chat
    echo.
    
    echo [2/3] Применение миграций...
    docker-compose exec -T web python manage.py migrate
    echo.
    
    echo [3/3] Проверка установки...
    docker-compose exec -T web python manage.py showmigrations chat
    echo.
    
    echo ========================================
    echo Готово! Чат настроен в Docker.
    echo ========================================
    echo.
    echo Чат доступен по адресу:
    echo   http://localhost:8000/api/chat/chats/
    echo.
) else (
    echo Docker не запущен. Используем локальное окружение...
    echo.
    
    echo [1/3] Создание миграций для чата...
    venv\Scripts\python.exe manage.py makemigrations chat
    echo.
    
    echo [2/3] Применение миграций...
    venv\Scripts\python.exe manage.py migrate
    echo.
    
    echo [3/3] Проверка установки...
    venv\Scripts\python.exe manage.py showmigrations chat
    echo.
    
    echo ========================================
    echo Готово! Чат настроен.
    echo ========================================
    echo.
    echo Теперь запустите сервер:
    echo   venv\Scripts\python.exe manage.py runserver
    echo.
)

pause
