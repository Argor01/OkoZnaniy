# 🚀 Быстрая настройка HTTPS для okoznaniy.ru

## Предварительные требования:
- ✅ DNS настроен: okoznaniy.ru → 45.12.239.226
- ✅ Порты 80 и 443 открыты

## Команды для хостинга:

```bash
# 1. Подключитесь
ssh root@45.12.239.226
cd ~/OkoZnaniy

# 2. Обновите .env
nano .env
```

Измените:
```env
FRONTEND_URL=https://okoznaniy.ru
ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226,okoznaniy.ru,www.okoznaniy.ru
DEBUG=False
```

```bash
# 3. Обновите frontend .env
nano frontend-react/.env.production
```

Содержимое:
```env
VITE_API_URL=https://okoznaniy.ru
```

```bash
# 4. Получите код из Git
git pull

# 5. Временно используйте конфиг без SSL
cp docker/nginx/conf.d/default.conf.before-ssl docker/nginx/conf.d/default.conf

# 6. Перезапустите
docker-compose down
docker-compose up -d

# 7. Установите certbot
apt update
apt install certbot -y

# 8. Остановите nginx в Docker
docker-compose stop nginx

# 9. Получите SSL сертификат
certbot certonly --standalone \
  -d okoznaniy.ru \
  -d www.okoznaniy.ru \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 10. Обновите docker-compose.yml
nano docker-compose.yml
```

В секции nginx volumes добавьте:
```yaml
volumes:
  - ./docker/nginx/conf.d:/etc/nginx/conf.d
  - ./docker/nginx/ssl:/etc/nginx/ssl
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - /var/www/certbot:/var/www/certbot
  - static_files:/var/www/static
  - media_files:/var/www/media
```

```bash
# 11. Верните конфиг с SSL
git checkout docker/nginx/conf.d/default.conf

# 12. Запустите всё
docker-compose up -d

# 13. Настройте Django Site
docker-compose exec backend python setup_site.py

# 14. Проверьте
curl -I https://okoznaniy.ru
```

## Автообновление сертификата:

```bash
crontab -e
```

Добавьте:
```
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /root/OkoZnaniy/docker-compose.yml restart nginx"
```

## Обновите Google OAuth:

В Google Cloud Console:
- JavaScript origins: `https://okoznaniy.ru`
- Redirect URIs: `https://okoznaniy.ru/api/accounts/google/login/callback/`

## Готово! 🎉

Откройте https://okoznaniy.ru - должен работать с HTTPS!
