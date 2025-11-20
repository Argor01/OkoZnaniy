# Деплой на Render

## Подготовка проекта

Проект готов к деплою на Render. Все необходимые файлы созданы:
- `render.yaml` - конфигурация для Render
- `.node-version` - версия Node.js

## Шаги для деплоя

### 1. Подготовка репозитория
```bash
cd frontend-react
git add .
git commit -m "Prepare for Render deployment"
git push
```

### 2. Создание сервиса на Render

1. Зайдите на [render.com](https://render.com)
2. Нажмите **New +** → **Static Site**
3. Подключите ваш GitHub/GitLab репозиторий
4. Настройте параметры:
   - **Name**: okoznaniy-frontend (или любое другое имя)
   - **Root Directory**: `frontend-react`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 3. Автоматический деплой

Render автоматически:
- Установит зависимости
- Соберет проект
- Задеплоит статические файлы
- Настроит маршрутизацию для SPA

### 4. Переменные окружения (если нужны)

Если у вас есть API, добавьте в Render:
- `VITE_API_URL` - URL вашего бэкенда

### 5. Custom Domain (опционально)

После деплоя можете добавить свой домен в настройках Render.

## Локальная проверка перед деплоем

```bash
# Сборка проекта
npm run build

# Предпросмотр продакшен версии
npm run preview
```

## Структура проекта

```
frontend-react/
├── dist/              # Собранные файлы (создается при build)
├── public/            # Статические файлы
├── src/               # Исходный код
├── render.yaml        # Конфигурация Render
├── .node-version      # Версия Node.js
├── package.json       # Зависимости
└── vite.config.ts     # Конфигурация Vite
```

## Troubleshooting

### Проблема: 404 при переходе по прямым ссылкам
**Решение**: Убедитесь что в `render.yaml` настроен rewrite на `/index.html`

### Проблема: Ошибки сборки
**Решение**: Проверьте логи в Render Dashboard и убедитесь что все зависимости установлены

### Проблема: Белый экран после деплоя
**Решение**: Проверьте пути к ресурсам и настройки `base` в `vite.config.ts`
