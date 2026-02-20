@echo off
echo ========================================
echo Перезапуск Frontend для применения изменений
echo ========================================
echo.

cd frontend-react

echo Очистка кэша...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Кэш очищен
) else (
    echo Кэш не найден, пропускаем
)

echo.
echo ========================================
echo Теперь запустите: npm start
echo ========================================
echo.
echo Или нажмите любую клавишу для автозапуска...
pause

npm start
