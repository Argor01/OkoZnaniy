# Деплой на хостинг по IP адресу

## IP адрес сервера: 45.12.239.226

## Шаги для деплоя:

### 1. Подключитесь к серверу
```bash
ssh root@45.12.239.226
```

### 2. Установите необходимые пакеты (если еще не установлены)
```bash
# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установите Docker Compose
apt install docker-compose -y

# Установите Git
apt install git -y
```

### 3. Клонируйте проект
```bash
cd ~
git clone <ваш-репозиторий> OkoZnaniy
cd OkoZnaniy
```

### 4. Настройте переменные окружения
Создайте файл `.env` на сервере:
```bash
nano .env
```

Скопируйте содержимое:
```env
# Django settings
SECRET_KEY=django-insecure-tcu$-ps(+2&ky=7io4q#ypq-ct34oy4zw=pu#rizg^j%#@&j51
DEBUG=False
DJANGO_ENV=production

# Database settings
POSTGRES_PASSWORD=postgres123
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/oko_db

# Redis settings
REDIS_URL=redis://redis:6379/0

# Bot settings
TELEGRAM_BOT_TOKEN=8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo

# Security settings
ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx,45.12.239.226

# Email settings (Yandex)
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=YanBrait@yandex.ru
EMAIL_HOST_PASSWORD=tvfibdueaqwoipxn
DEFAULT_FROM_EMAIL=YanBrait@yandex.ru

# Frontend URL
FRONTEND_URL=http://45.12.239.226

# Google OAuth settings
GOOGLE_CLIENT_ID=39214647053-574s91uu0g4eonj7jbc3tro884vtp4pq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# VK OAuth settings
VK_CLIENT_ID=your_vk_client_id
VK_CLIENT_SECRET=your_vk_client_secret
```

**ВАЖНО:** Измените `SECRET_KEY` на новый случайный ключ для продакшена!

### 5. Обновите frontend конфигурацию
Отредактируйте `frontend-react/.env.production`:
```bash
nano frontend-react/.env.production
```

Содержимое:
```env
VITE_API_URL=http://45.12.239.226
```

### 6. Запустите проект
```bash
# Соберите и запустите контейнеры
docker-compose up -d --build

# Проверьте статус
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

### 7. Выполните миграции и создайте суперпользователя
```bash
# Миграции
docker-compose exec backend python manage.py migrate

# Соберите статику
docker-compose exec backend python manage.py collectstatic --noinput

# Создайте суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

### 8. Проверьте работу
Откройте в браузере:
- **Фронтенд:** http://45.12.239.226
- **API:** http://45.12.239.226/api/
- **Админка:** http://45.12.239.226/admin/
- **Health check:** http://45.12.239.226/health

## Полезные команды

### Просмотр логов
```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f telegram-bot
docker-compose logs -f nginx
```

### Перезапуск сервисов
```bash
# Перезапустить все
docker-compose restart

# Перезапустить конкретный сервис
docker-compose restart backend
docker-compose restart nginx
```

### Остановка и запуск
```bash
# Остановить все
docker-compose down

# Запустить все
docker-compose up -d

# Пересобрать и запустить
docker-compose up -d --build
```

### Обновление кода
```bash
# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker-compose up -d --build

# Выполнить миграции
docker-compose exec backend python manage.py migrate

# Собрать статику
docker-compose exec backend python manage.py collectstatic --noinput
```

### Очистка
```bash
# Удалить неиспользуемые образы
docker system prune -a

# Удалить все (включая volumes)
docker-compose down -v
```

## Настройка firewall (опционально)

```bash
# Установите ufw
apt install ufw -y

# Разрешите SSH
ufw allow 22/tcp

# Разрешите HTTP
ufw allow 80/tcp

# Разрешите HTTPS (для будущего)
ufw allow 443/tcp

# Включите firewall
ufw enable
```

## Мониторинг

### Проверка использования ресурсов
```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

## Troubleshooting

### Если контейнер не запускается
```bash
# Посмотрите логи
docker-compose logs <service-name>

# Проверьте статус
docker-compose ps

# Перезапустите
docker-compose restart <service-name>
```

### Если база данных не подключается
```bash
# Проверьте что postgres запущен
docker-compose ps postgres

# Посмотрите логи postgres
docker-compose logs postgres

# Перезапустите postgres
docker-compose restart postgres
```

### Если статика не отдается
```bash
# Соберите статику заново
docker-compose exec backend python manage.py collectstatic --noinput

# Перезапустите nginx
docker-compose restart nginx
```

## Backup базы данных

```bash
# Создать backup
docker-compose exec postgres pg_dump -U postgres oko_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из backup
docker-compose exec -T postgres psql -U postgres oko_db < backup_20231122_120000.sql
```

## Когда будет домен

Когда получите домен, обновите:

1. **nginx конфигурацию** (`docker/nginx/conf.d/default.conf`):
   - Замените `server_name 45.12.239.226;` на `server_name yourdomain.com www.yourdomain.com;`

2. **.env файл**:
   - Замените `FRONTEND_URL=http://45.12.239.226` на `FRONTEND_URL=https://yourdomain.com`
   - Добавьте домен в `ALLOWED_HOSTS`

3. **Установите SSL сертификат** (Let's Encrypt):
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
