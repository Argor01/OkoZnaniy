#!/bin/bash

# 🚀 Автоматическая настройка HTTPS для okoznaniy.ru
# Запускать на хостинге: bash setup_ssl_hosting.sh

set -e

echo "🔧 Настройка HTTPS для okoznaniy.ru"
echo "===================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Ошибка: docker-compose.yml не найден${NC}"
    echo "Запустите скрипт из корня проекта OkoZnaniy"
    exit 1
fi

echo -e "${YELLOW}📧 Введите ваш email для Let's Encrypt:${NC}"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email обязателен${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Шаг 1/8: Обновление кода из Git${NC}"
git pull origin main

echo ""
echo -e "${GREEN}✅ Шаг 2/8: Проверка .env файла${NC}"
if ! grep -q "okoznaniy.ru" .env; then
    echo -e "${YELLOW}⚠️  Обновляем .env для домена okoznaniy.ru${NC}"
    
    # Создаем backup
    cp .env .env.backup
    
    # Обновляем настройки
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://okoznaniy.ru|' .env
    sed -i 's|ALLOWED_HOSTS=.*|ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226,okoznaniy.ru,www.okoznaniy.ru|' .env
    sed -i 's|DEBUG=.*|DEBUG=False|' .env
    
    echo -e "${GREEN}✓ .env обновлен${NC}"
else
    echo -e "${GREEN}✓ .env уже настроен${NC}"
fi

echo ""
echo -e "${GREEN}✅ Шаг 3/8: Настройка frontend .env${NC}"
cat > frontend-react/.env.production << EOF
VITE_API_URL=https://okoznaniy.ru
EOF
echo -e "${GREEN}✓ frontend .env создан${NC}"

echo ""
echo -e "${GREEN}✅ Шаг 4/8: Временный запуск без SSL${NC}"
cp docker/nginx/conf.d/default.conf.before-ssl docker/nginx/conf.d/default.conf
docker-compose down
docker-compose up -d
echo -e "${GREEN}✓ Контейнеры запущены${NC}"

echo ""
echo -e "${GREEN}✅ Шаг 5/8: Установка certbot${NC}"
if ! command -v certbot &> /dev/null; then
    apt update
    apt install certbot -y
    echo -e "${GREEN}✓ certbot установлен${NC}"
else
    echo -e "${GREEN}✓ certbot уже установлен${NC}"
fi

echo ""
echo -e "${GREEN}✅ Шаг 6/8: Остановка nginx для получения сертификата${NC}"
docker-compose stop nginx

echo ""
echo -e "${GREEN}✅ Шаг 7/8: Получение SSL сертификата${NC}"
if [ ! -d "/etc/letsencrypt/live/okoznaniy.ru" ]; then
    certbot certonly --standalone \
      -d okoznaniy.ru \
      -d www.okoznaniy.ru \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      --non-interactive
    echo -e "${GREEN}✓ SSL сертификат получен${NC}"
else
    echo -e "${GREEN}✓ SSL сертификат уже существует${NC}"
fi

echo ""
echo -e "${GREEN}✅ Шаг 8/8: Запуск с SSL${NC}"
# Возвращаем конфиг с SSL
git checkout docker/nginx/conf.d/default.conf

# Перезапускаем все контейнеры
docker-compose down
docker-compose up -d --build

# Ждем запуска
echo -e "${YELLOW}⏳ Ожидание запуска контейнеров (30 сек)...${NC}"
sleep 30

# Настраиваем Django Site
echo -e "${YELLOW}🔧 Настройка Django Site...${NC}"
docker-compose exec -T backend python setup_site.py

echo ""
echo -e "${GREEN}✅ Настройка автообновления сертификата${NC}"
# Проверяем есть ли уже задание в cron
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook \"docker-compose -f $(pwd)/docker-compose.yml restart nginx\"") | crontab -
    echo -e "${GREEN}✓ Cron задание добавлено${NC}"
else
    echo -e "${GREEN}✓ Cron задание уже существует${NC}"
fi

echo ""
echo "===================================="
echo -e "${GREEN}🎉 HTTPS настроен успешно!${NC}"
echo "===================================="
echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo ""
echo "1. Проверьте сайт:"
echo "   https://okoznaniy.ru"
echo ""
echo "2. Обновите Google OAuth в Google Cloud Console:"
echo "   - JavaScript origins: https://okoznaniy.ru"
echo "   - Redirect URIs: https://okoznaniy.ru/api/accounts/google/login/callback/"
echo ""
echo "3. Проверьте статус контейнеров:"
echo "   docker-compose ps"
echo ""
echo "4. Посмотрите логи при необходимости:"
echo "   docker-compose logs -f nginx"
echo ""
echo -e "${GREEN}✅ Готово!${NC}"
