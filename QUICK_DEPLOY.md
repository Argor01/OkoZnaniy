# Быстрый деплой на 45.12.239.226

## 1. Подключитесь к серверу
```bash
ssh root@45.12.239.226
```

## 2. Установите Docker (если нужно)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y
```

## 3. Клонируйте проект
```bash
cd ~
git clone <ваш-репозиторий> OkoZnaniy
cd OkoZnaniy
```

## 4. Скопируйте .env файл
Создайте `.env` с правильными настройками (см. docs/DEPLOY_IP.md)

**ВАЖНО:** Измените `DEBUG=False` и `SECRET_KEY` для продакшена!

## 5. Запустите проект
```bash
docker-compose up -d --build
```

## 6. Выполните миграции
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
docker-compose exec backend python manage.py createsuperuser
```

## 7. Проверьте
Откройте http://45.12.239.226 в браузере

## Полезные команды
```bash
# Логи
docker-compose logs -f

# Статус
docker-compose ps

# Перезапуск
docker-compose restart

# Остановка
docker-compose down

# Обновление
git pull && docker-compose up -d --build
```

Подробная документация: `docs/DEPLOY_IP.md`
