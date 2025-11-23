# 🚀 SSL Шпаргалка - Быстрые команды

## Подключение к хостингу

```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
```

## Автоматическая настройка (1 команда!)

```bash
git pull && bash setup_ssl_hosting.sh
```

## Быстрая проверка

```bash
# Статус
docker-compose ps

# HTTPS работает?
curl -I https://okoznaniy.ru

# Логи
docker-compose logs -f nginx
```

## Перезапуск

```bash
docker-compose restart
```

## Обновление кода

```bash
git pull
docker-compose down
docker-compose up -d --build
```

## Проблемы?

```bash
# Полный перезапуск
docker-compose down
docker-compose up -d

# Логи всех сервисов
docker-compose logs

# Только nginx
docker-compose logs nginx

# Только backend
docker-compose logs backend
```

## SSL сертификат

```bash
# Проверить сертификат
certbot certificates

# Обновить вручную
certbot renew

# Тест обновления
certbot renew --dry-run
```

## Google OAuth настройки

После настройки SSL обновите в Google Cloud Console:

- **JavaScript origins:** `https://okoznaniy.ru`
- **Redirect URIs:** `https://okoznaniy.ru/api/accounts/google/login/callback/`

## Готово! ✅

Сайт: https://okoznaniy.ru
