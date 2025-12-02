# Деплой проекта на хостинг

## 🚀 Варианты деплоя

### 1. Render.com (рекомендуется) ✅
### 2. VPS/Dedicated сервер
### 3. Heroku
### 4. DigitalOcean
### 5. AWS

---

## 📦 Вариант 1: Render.com (ГОТОВАЯ КОНФИГУРАЦИЯ)

### Преимущества:
- ✅ Бесплатный план
- ✅ Автоматический деплой из GitHub
- ✅ Встроенная PostgreSQL
- ✅ Встроенный Redis
- ✅ SSL сертификаты
- ✅ Конфигурация уже готова (`render.yaml`)

### Шаги деплоя:

#### 1. Создайте аккаунт на Render
```
https://render.com/
```

#### 2. Подключите GitHub репозиторий
1. Нажмите "New" → "Blueprint"
2. Подключите репозиторий: `https://github.com/Argor01/OkoZnaniy`
3. Выберите ветку: `main`

#### 3. Render автоматически найдет `render.yaml`
Конфигурация создаст:
- ✅ PostgreSQL база данных
- ✅ Redis
- ✅ Django Backend
- ✅ React Frontend
- ✅ Telegram Bot

#### 4. Настройте переменные окружения
В Render Dashboard добавьте:

```env
# Google OAuth
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_secret

# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен

# Email (Yandex)
EMAIL_HOST_USER=YanBrait@yandex.ru
EMAIL_HOST_PASSWORD=ваш_пароль
```

#### 5. Обновите Google OAuth Redirect URI
В Google Cloud Console добавьте:
```
https://okoznaniy-backend.onrender.com/api/accounts/google/login/callback/
```

#### 6. Деплой!
Нажмите "Apply" и Render автоматически:
- Создаст все сервисы
- Установит зависимости
- Соберет frontend
- Запустит backend
- Применит миграции

### URL после деплоя:
```
Frontend: https://okoznaniy-frontend.onrender.com
Backend:  https://okoznaniy-backend.onrender.com
```

---

## 🖥️ Вариант 2: VPS/Dedicated сервер

### Требования:
- Ubuntu 20.04+ / Debian 11+
- Docker и Docker Compose
- Домен (опционально)
- SSL сертификат (опционально)

### Шаги деплоя:

#### 1. Подключитесь к серверу
```bash
ssh user@your-server-ip
```

#### 2. Установите Docker
```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установите Docker Compose
sudo apt install docker-compose -y

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER
```

#### 3. Клонируйте репозиторий
```bash
git clone https://github.com/Argor01/OkoZnaniy.git
cd OkoZnaniy
git checkout main
```

#### 4. Настройте .env
```bash
cp .env.example .env
nano .env
```

Обновите:
```env
# Основные
SECRET_KEY=ваш_секретный_ключ
DEBUG=False
DJANGO_ENV=production

# База данных
POSTGRES_PASSWORD=надежный_пароль
DATABASE_URL=postgresql://postgres:пароль@postgres:5432/oko_db

# Frontend URL (ваш домен)
FRONTEND_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_secret

# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен

# Email
EMAIL_HOST_USER=ваш_email
EMAIL_HOST_PASSWORD=ваш_пароль
```

#### 5. Обновите docker-compose.yml для production
```yaml
services:
  backend:
    environment:
      - FRONTEND_URL=https://your-domain.com
      - ALLOWED_HOSTS=your-domain.com,www.your-domain.com
      
  frontend:
    environment:
      - VITE_API_URL=https://your-domain.com
```

#### 6. Запустите проект
```bash
docker-compose up -d --build
```

#### 7. Проверьте статус
```bash
docker-compose ps
docker-compose logs -f
```

#### 8. Настройте Nginx (если нужен домен)
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/okoznaniy
```

Конфигурация:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/okoznaniy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 9. Установите SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🔄 Обновление на хосте:

### Автоматическое обновление:
```bash
cd OkoZnaniy
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Или создайте скрипт:
```bash
nano update.sh
```

```bash
#!/bin/bash
cd /path/to/OkoZnaniy
git pull origin main
docker-compose down
docker-compose up -d --build
echo "✅ Проект обновлен!"
```

Сделайте исполняемым:
```bash
chmod +x update.sh
./update.sh
```

---

## 🐛 Решение проблем на хосте:

### Порты заняты:
```bash
# Проверить, что использует порт
sudo netstat -tulpn | grep :5173
sudo netstat -tulpn | grep :8000

# Остановить процесс
sudo kill -9 PID
```

### Недостаточно памяти:
```bash
# Проверить память
free -h

# Добавить swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Docker не запускается:
```bash
# Проверить статус Docker
sudo systemctl status docker

# Перезапустить Docker
sudo systemctl restart docker

# Очистить Docker
docker system prune -a
```

### База данных не подключается:
```bash
# Проверить логи postgres
docker-compose logs postgres

# Пересоздать volume
docker-compose down -v
docker-compose up -d
```

---

## 📊 Мониторинг на хосте:

### Проверка статуса:
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f
```

### Проверка доступности:
```bash
# Frontend
curl http://localhost:5173/

# Backend API
curl http://localhost:8000/api/

# Health check
curl http://localhost:8000/api/health/
```

---

## 🔐 Безопасность на production:

### 1. Обновите .env:
```env
DEBUG=False
SECRET_KEY=длинный_случайный_ключ
ALLOWED_HOSTS=your-domain.com
```

### 2. Настройте firewall:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 3. Регулярные бэкапы:
```bash
# Бэкап базы данных
docker-compose exec postgres pg_dump -U postgres oko_db > backup.sql

# Бэкап media файлов
tar -czf media_backup.tar.gz media/
```

---

## 📝 Чеклист деплоя:

- [ ] Сервер настроен (Docker установлен)
- [ ] Репозиторий склонирован
- [ ] .env настроен для production
- [ ] docker-compose.yml обновлен
- [ ] Проект запущен (docker-compose up -d)
- [ ] Nginx настроен (если нужен домен)
- [ ] SSL сертификат установлен
- [ ] Google OAuth redirect URI обновлен
- [ ] Firewall настроен
- [ ] Бэкапы настроены
- [ ] Мониторинг настроен

---

## ✅ Итог:

Для деплоя на хостинг:

### Быстрый способ (Render.com):
1. Подключите GitHub
2. Render автоматически задеплоит
3. Настройте переменные окружения
4. Готово!

### Полный контроль (VPS):
1. Установите Docker
2. Клонируйте репозиторий
3. Настройте .env
4. Запустите docker-compose up -d
5. Настройте Nginx и SSL
6. Готово!

**Рекомендую Render.com для быстрого старта!** 🚀
