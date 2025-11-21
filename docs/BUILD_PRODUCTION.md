# Production сборка проекта

## ✅ Проект собран успешно!

### 📦 Результат сборки

Все файлы находятся в папке: `frontend-react/dist/`

### 📊 Статистика сборки

```
✓ 5686 модулей обработано
✓ Время сборки: 12.55s

Файлы:
- index.html           0.63 kB  (gzip: 0.39 kB)
- index-D8M66ABc.css  80.66 kB  (gzip: 14.15 kB)
- index-XnP3Ij0Z.js    2.65 MB  (gzip: 759.10 kB)
```

### 📁 Структура dist/

```
frontend-react/dist/
├── index.html                    # Главный HTML файл
├── vite.svg                      # Иконка
├── _redirects                    # Правила редиректов
├── assets/
│   ├── index-D8M66ABc.css       # Все стили
│   ├── index-XnP3Ij0Z.js        # Весь JavaScript
│   ├── logo.png                  # Логотипы
│   ├── google.png                # Иконки соц. сетей
│   ├── telegram.png
│   ├── vk.png
│   └── [папки с изображениями]
│       ├── advantages/
│       ├── faq/
│       ├── first-screen/
│       ├── icons/
│       ├── leave-order/
│       ├── only-pro/
│       ├── place-task/
│       ├── place-task-info/
│       └── prices/
```

## 🚀 Как использовать собранные файлы

### Вариант 1: Nginx (рекомендуется)

1. Скопируйте содержимое `dist/` на сервер:
   ```bash
   scp -r frontend-react/dist/* user@server:/var/www/html/
   ```

2. Настройте Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://backend:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. Перезапустите Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

### Вариант 2: Docker (текущая конфигурация)

Файлы уже используются в Docker контейнере `frontend`:

```yaml
frontend:
  build:
    context: ./frontend-react
    dockerfile: Dockerfile
  ports:
    - "5173:80"
```

Dockerfile автоматически собирает проект и копирует в Nginx.

### Вариант 3: Статический хостинг

Загрузите содержимое `dist/` на любой статический хостинг:
- **Netlify**: перетащите папку dist в веб-интерфейс
- **Vercel**: `vercel deploy --prod`
- **GitHub Pages**: скопируйте в ветку gh-pages
- **AWS S3**: загрузите через AWS CLI

### Вариант 4: Локальный просмотр

Используйте простой HTTP сервер:

```bash
# Python
cd frontend-react/dist
python -m http.server 8080

# Node.js (npx)
npx serve frontend-react/dist

# Node.js (http-server)
npm install -g http-server
http-server frontend-react/dist
```

Откройте: http://localhost:8080/

## ⚙️ Настройка API URL

### Для production

Обновите `frontend-react/.env.production`:

```env
VITE_API_URL=https://your-api-domain.com
```

Пересоберите:
```bash
cd frontend-react
npm run build
```

### Для разных окружений

```bash
# Development
npm run dev

# Production
npm run build

# Preview production build
npm run preview
```

## 🔧 Оптимизация сборки

### Уменьшение размера bundle

Текущий размер JS: 2.65 MB (gzip: 759 KB)

Для уменьшения размера можно:

1. **Code splitting** - разделить на чанки:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'antd-vendor': ['antd'],
             'router': ['react-router-dom'],
           }
         }
       }
     }
   })
   ```

2. **Lazy loading** - ленивая загрузка страниц:
   ```typescript
   const ExpertDashboard = lazy(() => import('./pages/ExpertDashboard'));
   ```

3. **Tree shaking** - удаление неиспользуемого кода (уже включено)

4. **Compression** - сжатие на сервере (Nginx gzip)

## 📝 Проверка сборки

### 1. Проверить размеры файлов
```bash
cd frontend-react/dist
ls -lh assets/
```

### 2. Проверить содержимое
```bash
# Открыть index.html в браузере
start index.html  # Windows
open index.html   # Mac
xdg-open index.html  # Linux
```

### 3. Проверить работу API
Убедитесь, что в коде правильный API URL:
```javascript
// Должно быть в собранном JS
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## 🐛 Решение проблем

### Белый экран после деплоя

**Причина:** Неправильный base path

**Решение:** Обновите `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/',  // или '/your-subdirectory/'
})
```

### 404 на роутах

**Причина:** Сервер не настроен для SPA

**Решение:** Настройте fallback на index.html:
- Nginx: `try_files $uri $uri/ /index.html;`
- Apache: `.htaccess` с RewriteRule
- Netlify: файл `_redirects` (уже есть)

### API запросы не работают

**Причина:** CORS или неправильный API URL

**Решение:**
1. Проверьте VITE_API_URL
2. Настройте CORS на backend
3. Используйте proxy в Nginx

## 📦 Деплой на разные платформы

### Netlify
```bash
# Установить CLI
npm install -g netlify-cli

# Деплой
cd frontend-react
netlify deploy --prod --dir=dist
```

### Vercel
```bash
# Установить CLI
npm install -g vercel

# Деплой
cd frontend-react
vercel --prod
```

### GitHub Pages
```bash
# Установить gh-pages
npm install -g gh-pages

# Деплой
cd frontend-react
gh-pages -d dist
```

### Docker Hub
```bash
# Собрать образ
docker build -t your-username/oko-znaniy-frontend ./frontend-react

# Запушить
docker push your-username/oko-znaniy-frontend
```

## ✅ Чеклист деплоя

- [x] Проект собран (`npm run build`)
- [x] Файлы в `dist/` созданы
- [x] index.html содержит правильные пути
- [ ] API URL настроен для production
- [ ] Сервер настроен для SPA
- [ ] CORS настроен на backend
- [ ] SSL сертификат установлен (для HTTPS)
- [ ] Домен настроен
- [ ] DNS записи обновлены

## 🎯 Итог

Production сборка готова в папке `frontend-react/dist/`

Все файлы оптимизированы и готовы к деплою на любой хостинг!
