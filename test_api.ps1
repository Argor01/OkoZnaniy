# PowerShell скрипт для тестирования API

Write-Host "=== Тестирование API Личного Кабинета Эксперта ===" -ForegroundColor Green
Write-Host ""

# 1. Получаем токен
Write-Host "1. Получение токена..." -ForegroundColor Yellow
$loginData = @{
    username = "test_expert"
    password = "Password123!@#"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/token/" -Method Post -Body $loginData -ContentType "application/json"
    $token = $response.access
    Write-Host "✅ Токен получен: $($token.Substring(0,20))..." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Ошибка получения токена: $_" -ForegroundColor Red
    exit
}

# Заголовки с токеном
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Тестируем статистику
Write-Host "2. Получение статистики..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/experts/dashboard/statistics/" -Method Get -Headers $headers
    Write-Host "✅ Статистика получена:" -ForegroundColor Green
    $stats | ConvertTo-Json -Depth 3
    Write-Host ""
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

# 3. Тестируем финансовую сводку
Write-Host "3. Получение финансовой сводки..." -ForegroundColor Yellow
try {
    $finance = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/experts/dashboard/financial-summary/" -Method Get -Headers $headers
    Write-Host "✅ Финансовая сводка получена:" -ForegroundColor Green
    $finance | ConvertTo-Json -Depth 3
    Write-Host ""
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

# 4. Тестируем транзакции
Write-Host "4. Получение транзакций..." -ForegroundColor Yellow
try {
    $transactions = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/experts/dashboard/transactions/" -Method Get -Headers $headers
    Write-Host "✅ Транзакции получены:" -ForegroundColor Green
    $transactions | ConvertTo-Json -Depth 3
    Write-Host ""
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

# 5. Тестируем профиль
Write-Host "5. Получение профиля..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/experts/dashboard/profile/" -Method Get -Headers $headers
    Write-Host "✅ Профиль получен:" -ForegroundColor Green
    $profile | ConvertTo-Json -Depth 3
    Write-Host ""
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

Write-Host "=== Тестирование завершено ===" -ForegroundColor Green
