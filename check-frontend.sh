#!/bin/bash

echo "🔍 Проверка статуса фронтенда..."
echo ""

# Проверка контейнера
echo "📦 Статус контейнера:"
docker-compose ps frontend
echo ""

# Проверка файлов
echo "📁 Проверка файлов:"
if [ -f "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx" ]; then
    echo "✅ AdminChatsSection.tsx существует"
else
    echo "❌ AdminChatsSection.tsx НЕ НАЙДЕН"
fi

if [ -f "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.module.css" ]; then
    echo "✅ AdminChatsSection.module.css существует"
else
    echo "❌ AdminChatsSection.module.css НЕ НАЙДЕН"
fi
echo ""

# Проверка импорта
echo "🔗 Проверка импорта CSS-модуля:"
if grep -q "import styles from './AdminChatsSection.module.css'" "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx"; then
    echo "✅ CSS-модуль импортирован"
else
    echo "❌ CSS-модуль НЕ импортирован"
fi
echo ""

# Проверка переменных адаптивности
echo "📱 Проверка адаптивности:"
if grep -q "const isMobile = windowWidth < 768" "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx"; then
    echo "✅ Переменная isMobile найдена"
else
    echo "❌ Переменная isMobile НЕ найдена"
fi

if grep -q "const isTablet = windowWidth >= 768 && windowWidth < 1024" "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx"; then
    echo "✅ Переменная isTablet найдена"
else
    echo "❌ Переменная isTablet НЕ найдена"
fi
echo ""

# Последние логи
echo "📋 Последние логи фронтенда:"
docker-compose logs --tail=5 frontend
echo ""

echo "✅ Проверка завершена!"
echo ""
echo "🌐 Откройте http://localhost:5173 и очистите кэш браузера (Ctrl+Shift+Delete)"
