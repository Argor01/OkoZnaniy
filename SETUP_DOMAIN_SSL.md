# Настройка домена okoznaniy.ru с HTTPS

## Шаг 1: Настройка DNS

Убедитесь что DNS записи указывают на ваш сервер:

```
A запись: okoznaniy.ru → 45.12.239.226
A запись: www.okoznaniy.ru → 45.12.239.226
```

Проверьте DNS:
```bash
nslookup okoznaniy.ru
nslookup www.okoznaniy.ru
```

## Шаг 2: Обновите .env файл

На хостинге:
```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
nano .env
```

Измените:
```env
FRONTEND_URL=https://okoznaniy.ru
ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226,okoznaniy.ru,www.okoznaniy.ru
DEBUG=False
```

## Шаг 3: Обновите frontend .env.production

```bash
nano frontend-react/.env.production
```

Содержимое:
```env
VITE_API_URL=https://okoznaniy.ru
```

## Шаг 4: Получите код из Git

```bash
git pull
```

## Шаг 5: Установите Certbot

```bash
apt update
apt install certbot python3-certbot-nginx -y
```

## Шаг 6: Временно запустите nginx без SSL

Сначала нужно получить сертификат. Временно закомментируйте SSL строки в nginx:

```bash
nano docker/nginx/conf.d/default.conf
```

Закомментируйте строки с ssl_certificate (добавьте # в начале):
```nginx
#    ssl_certificate /etc/letsencrypt/live/okoznaniy.ru/fullchain.pem;
#    ssl_certificate_key /etc/letsencrypt/live/okoznaniy.ru/privkey.pem;
```

И временно измените `listen 443 ssl http2;` на `listen 443;`

Перезапустите:
```bash
docker-compose restart nginx
```

## Шаг 7: Получите SSL сертификат

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d okoznaniy.ru \
  -d www.okoznaniy.ru \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

## Шаг 8: Создайте volume для сертификатов

Добавьте в docker-compose.yml в секцию nginx volumes:
```yaml
volumes:
  - ./docker/nginx/conf.d:/etc/nginx/conf.d
  - ./docker/nginx/ssl:/etc/nginx/ssl
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - /var/www/certbot:/var/www/certbot
  - static_files:/var/www/static
  - media_files:/var/www/media
```

## Шаг 9: Раскомментируйте SSL настройки

```bash
nano docker/nginx/conf.d/default.conf
```

Раскомментируйте строки SSL и верните `listen 443 ssl http2;`

## Шаг 10: Пересоберите и перезапустите

```bash
docker-compose down
docker-compose up -d --build

# Настройте Django Site
docker-compose exec backend python setup_site.py
```

## Шаг 11: Настройте автообновление сертификата

Создайте cron задачу:
```bash
crontab -e
```

Добавьте:
```
0 3 * * * certbot renew --quiet && docker-compose -f /root/OkoZnaniy/docker-compose.yml restart nginx
```

## Шаг 12: Обновите Google OAuth

В Google Cloud Console добавьте:
- Authorized JavaScript origins: `https://okoznaniy.ru`
- Authorized redirect URIs: 
  - `https://okoznaniy.ru/api/accounts/google/login/callback/`
  - `https://okoznaniy.ru/auth/google/callback`

## Шаг 13: Обновите Django Admin

1. Откройте: https://okoznaniy.ru/admin/
2. Sites → измените domain на `okoznaniy.ru`
3. Social applications → проверьте настройки Google

## Проверка

Откройте https://okoznaniy.ru - должен работать с HTTPS! 🎉

## Troubleshooting

### Если certbot не может получить сертификат:

1. Проверьте что порт 80 открыт:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

2. Проверьте что nginx работает:
```bash
docker-compose ps nginx
```

3. Проверьте DNS:
```bash
dig okoznaniy.ru
```

### Если SSL не работает:

1. Проверьте что сертификаты созданы:
```bash
ls -la /etc/letsencrypt/live/okoznaniy.ru/
```

2. Проверьте логи nginx:
```bash
docker-compose logs nginx
```

3. Проверьте конфигурацию nginx:
```bash
docker-compose exec nginx nginx -t
```
