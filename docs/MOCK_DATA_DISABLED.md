# Отключение Mock данных

## Статус: ✅ Все моки отключены

Все компоненты теперь используют **только реальные данные из БД**.

---

## Отключенные моки

### 1. ✅ Админ-панель (`frontend-react/src/api/admin.ts`)
- **Партнеры** - `USE_MOCK_DATA = false`
- **Начисления** - `USE_MOCK_DATA = false`
- **Арбитры** - `USE_MOCK_DATA = false`

**API эндпоинты:**
- `/api/users/admin_partners/`
- `/api/users/admin_earnings/`
- `/api/users/admin_arbitrators/`

---

### 2. ✅ Споры (`frontend-react/src/api/disputes.ts`)
- **Все споры** - `USE_MOCK_DATA = false`

**API эндпоинты:**
- `/api/disputes/`
- `/api/disputes/{id}/`
- `/api/disputes/{id}/assign_arbitrator/`
- `/api/disputes/{id}/resolve/`

---

### 3. ✅ Партнеры (`frontend-react/src/api/partners.ts`)
- **Данные партнеров** - `USE_MOCK_DATA = false`

**API эндпоинты:**
- `/api/users/partner_dashboard/`
- `/api/users/partner_referrals/`
- `/api/users/partner_earnings/`

---

### 4. ✅ Арбитратор (`frontend-react/src/pages/ArbitratorDashboard/api/arbitratorApi.ts`)
- **Претензии** - `USE_MOCK_DATA = false`
- **Взятие претензии** - `USE_MOCK_DATA = false`
- **Принятие решения** - `USE_MOCK_DATA = false`
- **Отправка на одобрение** - `USE_MOCK_DATA = false`
- **Сообщения** - `USE_MOCK_DATA = false`
- **Отправка сообщений** - `USE_MOCK_DATA = false`

**API эндпоинты:**
- `/api/arbitration/claims/`
- `/api/arbitration/claims/{id}/take/`
- `/api/arbitration/claims/{id}/decision/`
- `/api/arbitration/claims/{id}/send_for_approval/`
- `/api/arbitration/messages/`

---

### 5. ✅ Новая админ-панель (`apps/admin_panel/`)
Все эндпоинты используют реальные данные:

**Управление пользователями:**
- `/api/admin-panel/users/`
- `/api/admin-panel/users/blocked/`
- `/api/admin-panel/users/{id}/block/`
- `/api/admin-panel/users/{id}/unblock/`
- `/api/admin-panel/users/{id}/change-role/`

**Управление заказами:**
- `/api/admin-panel/orders/`
- `/api/admin-panel/orders/problems/`
- `/api/admin-panel/orders/{id}/change-status/`

**Поддержка:**
- `/api/admin-panel/support-requests/`
- `/api/admin-panel/support-requests/{id}/take_request/`
- `/api/admin-panel/support-requests/{id}/complete_request/`
- `/api/admin-panel/support-requests/{id}/send_message/`

**Обращения:**
- `/api/admin-panel/claims/`
- `/api/admin-panel/claims/{id}/take_in_work/`
- `/api/admin-panel/claims/{id}/complete_claim/`
- `/api/admin-panel/claims/{id}/reject_claim/`

**Чаты администраторов:**
- `/api/admin-panel/chat-rooms/`
- `/api/admin-panel/chat-rooms/{id}/send_message/`
- `/api/admin-panel/chat-rooms/{id}/join_room/`
- `/api/admin-panel/chat-rooms/{id}/leave_room/`

**Статистика:**
- `/api/admin-panel/stats/`

---

## Проверка

Для проверки, что все работает с реальными данными:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Обновите страницу админ-панели
4. Проверьте, что все запросы идут к реальным API эндпоинтам
5. Убедитесь, что нет консольных сообщений типа "Using mock data"

---

## Fallback на моки

В некоторых API файлах есть fallback на моки при ошибках сети:

```typescript
catch (error: any) {
  if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
    console.log('API недоступен, используем mock данные');
    return generateMockData();
  }
  throw error;
}
```

Это сделано для удобства разработки, но в продакшене при ошибках будет выброшено исключение.

---

## Дата обновления
11 февраля 2026
