# Настройка Google OAuth

## Шаг 1: Настройка в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **Google+ API** (или **Google Identity API**)
4. Перейдите в **APIs & Services** → **Credentials**
5. Нажмите **Create Credentials** → **OAuth 2.0 Client ID**
6. Настройте OAuth consent screen (если еще не настроен):
   - User Type: External
   - App name: OkoZnaniy
   - User support email: ваш email
   - Developer contact: ваш email
   - Scopes: добавьте `email` и `profile`
7. Создайте OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: OkoZnaniy Local
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:8000`
   - Authorized redirect URIs:
     - `http://localhost:8000/api/accounts/google/login/callback/`
8. Скопируйте **Client ID** и **Client Secret**

## Шаг 2: Настройка в .env

Добавьте credentials в файл `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Шаг 3: Запуск скрипта настройки

Запустите скрипт для автоматической настройки в Django:

```bash
docker exec okoznaniy-backend-1 python setup_google_oauth.py
```

## Шаг 4: Проверка

1. Перейдите на страницу логина: `http://localhost:3000/login`
2. Нажмите на кнопку "Войти через Google"
3. Выберите Google аккаунт
4. Разрешите доступ к email и профилю
5. Вы будете перенаправлены на dashboard

## Как это работает

1. Пользователь нажимает кнопку "Войти через Google"
2. Открывается страница авторизации Google
3. После успешной авторизации Google перенаправляет на:
   `http://localhost:8000/api/accounts/google/login/callback/`
4. Django allauth обрабатывает callback и создает/обновляет пользователя
5. Custom adapter (`CustomSocialAccountAdapter`) сохраняет email из Google
6. View `google_callback` генерирует JWT токены
7. Пользователь перенаправляется на фронт с токенами в URL:
   `http://localhost:3000/dashboard?access=...&refresh=...`
8. Страница `GoogleCallback` извлекает токены из URL и сохраняет в localStorage
9. Пользователь перенаправляется на соответствующий dashboard

## Troubleshooting

### Ошибка "redirect_uri_mismatch"

Убедитесь, что в Google Cloud Console добавлен правильный redirect URI:
`http://localhost:8000/api/accounts/google/login/callback/`

### Email не сохраняется

Проверьте, что в Google Cloud Console в OAuth consent screen добавлены scopes:
- `email`
- `profile`

### Пользователь не перенаправляется после авторизации

Проверьте логи backend:
```bash
docker logs okoznaniy-backend-1 --tail 50
```

### Токены не сохраняются в localStorage

Откройте консоль браузера (F12) и проверьте:
1. Есть ли параметры `access` и `refresh` в URL
2. Нет ли ошибок JavaScript
