# Исправление localhost URL в фронтенде

## Что было сделано:

1. ✅ Создан `frontend-react/src/config/api.ts` - централизованная конфигурация API
2. ✅ Обновлен `SocialLoginButtons.tsx` - использует API_BASE_URL из конфига
3. ✅ Обновлен `api/client.ts` - использует API_URL из конфига

## Что нужно исправить вручную:

В следующих файлах нужно заменить `http://localhost:8000` на использование `getMediaUrl` из конфига:

### Файлы с аватарами:
- `frontend-react/src/pages/PurchasedWorks.tsx`
- `frontend-react/src/pages/ShopReadyWorks.tsx`
- `frontend-react/src/pages/ExpertDashboard.tsx`
- `frontend-react/src/pages/AddWorkToShop.tsx`
- `frontend-react/src/components/layout/DashboardLayout.tsx`
- `frontend-react/src/pages/ExpertProfile.tsx`

### Пример замены:

**Было:**
```typescript
src={profile?.avatar ? `http://localhost:8000${profile.avatar}` : undefined}
```

**Стало:**
```typescript
import { getMediaUrl } from '../../config/api';

src={getMediaUrl(profile?.avatar)}
```

### Файлы с API URL:
- `frontend-react/src/pages/RegisterWithEmailVerification.tsx`
- `frontend-react/src/pages/GoogleRedirect.tsx`
- `frontend-react/src/pages/ExpertProfile.tsx`
- `frontend-react/src/components/auth/TelegramLoginButton.tsx`
- `frontend-react/src/components/auth/EmailVerificationForm.tsx`

**Было:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**Стало:**
```typescript
import { API_BASE_URL } from '../../config/api';
```

## Быстрое решение для хостинга:

Пока не исправлены все файлы, убедитесь что:

1. В `.env.production` установлено:
   ```
   VITE_API_URL=http://45.12.239.226
   ```

2. Фронтенд пересобран:
   ```bash
   docker-compose down
   docker-compose up -d --build frontend
   ```

## После исправления всех файлов:

```bash
git add .
git commit -m "fix: Replace all localhost URLs with centralized API config"
git push origin main
```

На хостинге:
```bash
cd ~/OkoZnaniy
git pull
docker-compose up -d --build
```
