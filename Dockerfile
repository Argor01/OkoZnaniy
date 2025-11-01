FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY requirements.txt .

# Установка зависимостей Python
RUN pip install --no-cache-dir -r requirements.txt

# Создание пользователя для безопасности
RUN adduser --disabled-password --gecos '' appuser

# Копирование исходного кода
COPY . .

# Создание директорий для статических файлов и медиа
RUN mkdir -p /app/static /app/media

# Изменение владельца файлов
RUN chown -R appuser:appuser /app

# Переключение на пользователя
USER appuser

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings

# Порт
EXPOSE 8000

# Скрипт запуска
COPY --chown=appuser:appuser docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Запуск приложения
ENTRYPOINT ["/app/docker-entrypoint.sh"]
