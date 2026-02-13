@echo off
chcp 65001 >nul
echo.
echo 🔍 Проверка статуса фронтенда...
echo.

echo 📦 Статус контейнера:
docker-compose ps frontend
echo.

echo 📁 Проверка файлов:
if exist "frontend-react\src\pages\AdminDashboard\components\Sections\AdminChatsSection.tsx" (
    echo ✅ AdminChatsSection.tsx существует
) else (
    echo ❌ AdminChatsSection.tsx НЕ НАЙДЕН
)

if exist "frontend-react\src\pages\AdminDashboard\components\Sections\AdminChatsSection.module.css" (
    echo ✅ AdminChatsSection.module.css существует
) else (
    echo ❌ AdminChatsSection.module.css НЕ НАЙДЕН
)
echo.

echo 🔗 Проверка импорта CSS-модуля:
findstr /C:"import styles from './AdminChatsSection.module.css'" "frontend-react\src\pages\AdminDashboard\components\Sections\AdminChatsSection.tsx" >nul
if %errorlevel% equ 0 (
    echo ✅ CSS-модуль импортирован
) else (
    echo ❌ CSS-модуль НЕ импортирован
)
echo.

echo 📱 Проверка адаптивности:
findstr /C:"const isMobile = windowWidth < 768" "frontend-react\src\pages\AdminDashboard\components\Sections\AdminChatsSection.tsx" >nul
if %errorlevel% equ 0 (
    echo ✅ Переменная isMobile найдена
) else (
    echo ❌ Переменная isMobile НЕ найдена
)

findstr /C:"const isTablet = windowWidth >= 768 && windowWidth < 1024" "frontend-react\src\pages\AdminDashboard\components\Sections\AdminChatsSection.tsx" >nul
if %errorlevel% equ 0 (
    echo ✅ Переменная isTablet найдена
) else (
    echo ❌ Переменная isTablet НЕ найдена
)
echo.

echo 📋 Последние логи фронтенда:
docker-compose logs --tail=5 frontend
echo.

echo ✅ Проверка завершена!
echo.
echo 🌐 Откройте http://localhost:5173 и очистите кэш браузера:
echo    1. Нажмите Ctrl+Shift+Delete
echo    2. Выберите "Изображения и файлы в кеше"
echo    3. Нажмите "Удалить данные"
echo    4. Обновите страницу Ctrl+F5
echo.
pause
