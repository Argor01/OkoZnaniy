# Перезапуск Django для применения изменений

## Что изменено

В файле `.env` добавлена переменная:
```
FRONTEND_URL=http://localhost:5173
```

Теперь Django будет перенаправлять на правильный порт (5173) после Google авторизации.

## Как перезапустить Django

### Вариант 1: Через терминал где запущен Django

1. Найдите терминал где запущен Django (обычно показывает логи запросов)
2. Нажмите `Ctrl+C` чтобы остановить сервер
3. Запустите снова:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   или
   ```bash
   python manage.py runserver 0.0.0.0:3000
   ```

### Вариант 2: Через новый терминал

Если не можете найти терминал с Django:

1. Откройте новый терминал
2. Перейдите в корень проекта:
   ```bash
   cd путь/к/OkoZnaniy
   ```
3. Остановите все процессы Python:
   ```bash
   # Windows
   taskkill /F /IM python.exe
   
   # Linux/Mac
   pkill python
   ```
4. Запустите Django снова:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

### Вариант 3: Через Docker (если используется)

```bash
docker-compose restart backend
```

## Как проверить, что изменения применились

### 1. Проверьте логи Django

При запуске должно быть что-то вроде:
```
Django version X.X.X, using settings 'config.settings'
Starting development server at http://0.0.0.0:8000/
```

### 2. Проверьте переменную окружения

В Python shell:
```bash
python manage.py shell
```

Затем:
```python
from django.conf import settings
print(settings.FRONTEND_URL)
# Должно быть: http://localhost:5173
```

### 3. Попробуйте авторизоваться через Google

1. Откройте http://localhost:5173/
2. Нажмите "Войти через Google"
3. Выберите аккаунт Google
4. **Проверьте URL после редиректа** - должно быть `http://localhost:5173/...`

## Что должно работать после перезапуска

✅ Google авторизация перенаправляет на `http://localhost:5173/expert`
✅ Все callback URL используют порт 5173
✅ CORS работает для порта 5173
✅ CSRF работает для порта 5173

## Если все еще перенаправляет на порт 3000

### Проверьте .env файл

Убедитесь, что в `.env` есть:
```
FRONTEND_URL=http://localhost:5173
```

### Проверьте, что Django читает .env

В `config/settings.py` должно быть:
```python
from dotenv import load_dotenv
load_dotenv()
```

### Очистите кэш Django

```bash
python manage.py clearsessions
```

### Проверьте Google OAuth настройки

В Google Cloud Console:
1. Перейдите в Credentials
2. Найдите ваш OAuth 2.0 Client
3. Проверьте "Authorized redirect URIs"
4. Должно быть: `http://localhost:8000/api/accounts/google/login/callback/`

## Порты после изменений

| Сервис | Порт | URL | Назначение |
|--------|------|-----|------------|
| React (Vite) | 5173 | http://localhost:5173/ | Frontend UI |
| Django | 8000 | http://localhost:8000/ | Backend API |
| Django | 3000 | http://localhost:3000/ | Backend API (альтернативный) |

## Итоговая проверка

После перезапуска Django:

1. ✅ Откройте http://localhost:5173/
2. ✅ Нажмите "Войти через Google"
3. ✅ Выберите аккаунт
4. ✅ Проверьте, что URL стал `http://localhost:5173/expert`
5. ✅ Проверьте, что открылся ExpertDashboard с крутым сайдбаром

## Статус

✅ `.env` обновлен
✅ `FRONTEND_URL=http://localhost:5173` добавлен
⏳ Требуется перезапуск Django
