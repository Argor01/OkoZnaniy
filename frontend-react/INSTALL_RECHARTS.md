# Установка Recharts

Если вы видите ошибку `Failed to resolve import "recharts"`, выполните следующие шаги:

## Локальная установка

1. Убедитесь, что вы находитесь в директории frontend-react:
```bash
cd frontend-react
```

2. Установите recharts:
```bash
npm install recharts
```

3. Перезапустите dev-сервер:
```bash
npm run dev
```

## Установка в Docker контейнере

Если frontend запускается в Docker:

1. Остановите контейнеры:
```bash
docker-compose down
```

2. Пересоберите контейнеры:
```bash
docker-compose build --no-cache
```

3. Запустите контейнеры:
```bash
docker-compose up -d
```

Или, если frontend запускается в отдельном контейнере:

1. Войдите в контейнер:
```bash
docker exec -it <container_name> sh
```

2. Перейдите в директорию frontend:
```bash
cd frontend-react
```

3. Установите зависимости:
```bash
npm install
```

4. Перезапустите контейнер

## Проверка установки

После установки убедитесь, что recharts есть в package.json:
```json
{
  "dependencies": {
    "recharts": "^3.3.0"
  }
}
```

И в node_modules должна быть директория `recharts`.

## Альтернативное решение

Если проблемы с recharts продолжаются, можно использовать альтернативные библиотеки:
- @ant-design/charts (интеграция с Ant Design)
- Chart.js
- Victory

