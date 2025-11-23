# 🚀 Настройка HTTPS на хостинге - Простая инструкция

## Что нужно сделать на хостинге

### Вариант 1: Автоматический (рекомендуется) ⚡

Подключитесь к хостингу и выполните:

```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
git pull
bash setup_ssl_hosting.sh
```

Скрипт спросит ваш email и сделает всё автоматически!

---

### Вариант 2: Ручная настройка (если нужен контроль) 🔧

#### 1️⃣ Подключитесь к хостингу

```bash
ssh root@45.12.239.226
cd ~/OkoZnaniy
```

#### 2️⃣ Обновите код

```bash
git pull origin main
```

#### 3️⃣ Настройте .env файл

```bash
nano .env
```

Измените эти строки:

```env
FRONTEND_URL=https://okoznaniy.ru
ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226,okoznaniy.ru,www.okoznaniy.ru
DEBUG=False
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

#### 4️⃣ Настройте frontend

```bash
nano frontend-react/.env.production
```

Вставьте:

```env
VITE_API_URL=https://okoznaniy.ru
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

#### 5️⃣ Временно запустите без SSL

```bash
cp docker/nginx/conf.d/default.conf.before-ssl docker/nginx/conf.d/default.conf
docker-compose down
docker-compose up -d
```

#### 6️⃣ Установите certbot

```bash
apt update
apt install certbot -y
```

#### 7️⃣ Получите SSL сертификат

```bash
# Остановите nginx
docker-compose stop nginx

# Получите сертификат (замените email на свой!)
certbot certonly --standalone \
  -d okoznaniy.ru \
  -d www.okoznaniy.ru \
  --email ваш-email@example.com \
  --agree-tos \
  --no-eff-email
```

#### 8️⃣ Запустите с SSL

```bash
# Верните конфиг с SSL
git checkout docker/nginx/conf.d/default.conf

# Перезапустите всё
docker-compose down
docker-compose up -d --build

# Подождите 30 секунд
sleep 30

# Настройте Django
docker-compose exec backend python setup_site.py
```

#### 9️⃣ Настройте автообновление сертификата

```bash
crontab -e
```

Выберите редактор (nano - самый простой, обычно вариант 1)

Добавьте в конец файла:

```
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /root/OkoZnaniy/docker-compose.yml restart nginx"
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## ✅ Проверка

### Проверьте что всё работает:

```bash
# Статус контейнеров
docker-compose ps

# Проверка HTTPS
curl -I https://okoznaniy.ru

# Логи nginx (если нужно)
docker-compose logs -f nginx
```

### Откройте в браузере:

- https://okoznaniy.ru - должен открыться с зеленым замочком 🔒

---

## 🔑 Обновите Google OAuth

После настройки HTTPS обязательно обновите настройки в Google Cloud Console:

1. Откройте: https://console.cloud.google.com/apis/credentials
2. Выберите ваш OAuth 2.0 Client ID
3. Обновите:
   - **Authorized JavaScript origins:**
     ```
     https://okoznaniy.ru
     ```
   - **Authorized redirect URIs:**
     ```
     https://okoznaniy.ru/api/accounts/google/login/callback/
     ```
4. Сохраните изменения

---

## 🆘 Если что-то пошло не так

### Проблема: Сайт не открывается

```bash
# Проверьте статус
docker-compose ps

# Перезапустите
docker-compose restart

# Посмотрите логи
docker-compose logs nginx
docker-compose logs backend
```

### Проблема: SSL сертификат не получается

```bash
# Проверьте что порт 80 свободен
netstat -tulpn | grep :80

# Убедитесь что nginx остановлен
docker-compose stop nginx

# Попробуйте снова
certbot certonly --standalone -d okoznaniy.ru -d www.okoznaniy.ru
```

### Проблема: Google OAuth не работает

1. Проверьте что в Google Console указан правильный домен с `https://`
2. Проверьте `.env` файл - должен быть `FRONTEND_URL=https://okoznaniy.ru`
3. Перезапустите: `docker-compose restart backend`

---

## 📝 Важные команды

```bash
# Перезапуск всех контейнеров
docker-compose restart

# Остановка
docker-compose down

# Запуск
docker-compose up -d

# Логи
docker-compose logs -f

# Проверка сертификата
certbot certificates

# Тестовое обновление сертификата
certbot renew --dry-run
```

---

## ✨ Готово!

После выполнения всех шагов ваш сайт будет доступен по адресу:

**https://okoznaniy.ru** 🎉

HTTP автоматически перенаправляется на HTTPS, сертификат обновляется автоматически каждые 3 месяца.
