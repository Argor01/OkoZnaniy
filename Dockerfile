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

# Исправление окончаний строк и выдача прав
RUN if [ -f /app/docker-entrypoint.sh ]; then \
        sed -i 's/\r$//' /app/docker-entrypoint.sh || \
        (cat /app/docker-entrypoint.sh | tr -d '\r' > /app/docker-entrypoint.sh.tmp && mv /app/docker-entrypoint.sh.tmp /app/docker-entrypoint.sh) && \
        chmod +x /app/docker-entrypoint.sh; \
    fi

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

# Запуск приложения
ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]
