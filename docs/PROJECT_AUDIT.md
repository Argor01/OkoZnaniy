# Глубокий аудит проекта OkoZnaniy

**Дата:** 27 июля 2026
**Цель:** Найти баги, дыры в тестах, нестыковки API, сломанные сценарии, визуальные и адаптивные проблемы, риски регрессий.

---

## 1. Краткое резюме состояния проекта

Проект находится в **рабочем, но рискованном** состоянии. Основной функционал работает: заказы, финансы, чаты, арбитраж, админка, партнёрка. Однако выявлено **15 критичных и высоких** проблем, которые могут привести к потере данных денег и нарушению безопасности.

**Что хорошо:**
- 186 уникальных backend-тестов, 66 Playwright E2E тестов
- Полный жизненный цикл заказа с эскроу
- WebSocket чат с hybrid REST+WS подходом
- Партнёрская система с автоматическими начислениями
- Sandbox-режим для безопасного тестирования

**Что плохо:**
- 7 приложений完全没有 тестов (knowledge, notifications, payments, admin_panel, referal, core, dashboard)
- 3 критичных бага в backend (NameError, KeyError, 404 на arbitrator API)
- Финансовые операции НЕ атомарны (hold/release/status change в разных транзакциях)
- 52+ `except: pass` — молчаливое проглатывание ошибок
- 8 debug print() в продакшн API с утечкой Redis-ключей
- Тёмная тема покрывает ~30% UI
- 27 пустых CSS-заглушек в результатах рефакторинга

---

## 2. Таблица критичных багов

### P0 — Критичные (потеря данных/деньги/безопасность)

| # | Область | Файл:строка | Проблема | Почему важно | Исправление | Тест |
|---|---------|-------------|----------|-------------|-------------|------|
| 1 | Финансы | `payments/views.py:95,100` | `PaymentMethod` не импортирован — NameError при callback AlfaBank/SBP | Платежи не проходят, деньги не зачисляются | Импортировать `PaymentMethod` из `apps.payments.models` | `test_callback_with_valid_payment_method` |
| 2 | API | `frontend-react/src/features/arbitrator/api/arbitratorApi.ts` | Все 8+ эндпоинтов `/arbitrator/` возвращают 404 — бэкенд маунтит на `/arbitration/` | Весь функционал арбитратора сломан | Создать роутер `/api/arbitrator/` или исправить фронтенд-пути | `test_arbitrator_endpoints_exist` |
| 3 | API | `users/views.py:983-986` | `submit_expert_application` — `validated_data['first_name']` вызывает KeyError (поле нет в serializer) | Подача заявки на эксперта падает 500 | Добавить `first_name`, `last_name` в `ExpertApplicationSerializer` | `test_expert_application_with_name_fields` |
| 4 | Финансы | `orders/views.py:713,720-721` | `approve`: release funds + status change в РАЗНЫХ транзакциях | Если status save упадёт после release — деньги списаны, заказ не завершён | Обернуть в общий `transaction.atomic` с `select_for_update` | `test_approve_is_atomic` |
| 5 | Финансы | `orders/views.py:465,473-474` | `cancel_overdue`: refund + status change в РАЗНЫХ транзакциях | Деньги возвращены, но заказ остаётся active | Обернуть в общий `transaction.atomic` | `test_cancel_overdue_is_atomic` |
| 6 | Финансы | `orders/views.py:800,808-809` | `reject`: refund + status change в РАЗНЫХ транзакциях | Аналогично #4 и #5 | Обернуть в общий `transaction.atomic` | `test_reject_is_atomic` |
| 7 | Безопасность | `users/views.py:1532-1557` | 8 print() в `telegram_auth_status` — дамп auth_id, Redis-ключей, auth-данных в stdout | Утечка данных в продакшн | Заменить на `logger.debug()`, убрать вывод секретов | `test_no_debug_prints_in_production` |

### P1 — Высокие (нарушение бизнес-логики)

| # | Область | Файл:строка | Проблема | Почему важно | Исправление | Тест |
|---|---------|-------------|----------|-------------|-------------|------|
| 8 | Финансы | `orders/models.py:218-223` | `Order.save()` валидирует deadline ПОСЛЕ persist в БД | Заказ с прошедшим дедлайном сохраняется в БД | Валидировать ДО `super().save()` | `test_deadline_validated_before_save` |
| 9 | Финансы | `users/signals.py:29` | Партнёрская комиссия считается от `budget`, а не `final_price` | Партнёр получает % с полной суммы, хотя клиент заплатил меньше (скидка) | Исправить на `instance.final_price or instance.budget` | `test_partner_commission_uses_final_price` |
| 10 | Финансы | `users/signals.py:78-83` | Ошибка зачисления кошелька партнёра проглатывается | Партнёр теряет деньги без восстановления | Добавить retry или статус ошибки в `PartnerEarning` | `test_partner_wallet_credit_failure_raises` |
| 11 | Чат | `arbitration/views.py:1027` | `ComplaintViewSet.send_message` пишет в замороженный чат без проверки `is_frozen` | Блокировка чата обходится из арбитража | Добавить проверку `chat.is_frozen` | `test_complaint_message_respects_frozen_chat` |
| 12 | Арбитраж | `arbitration/views.py:873-880,908-913` | Закрытие Complaint размораживает заказ без проверки других активных Complaint/Case | Premature unfreeze если есть другой активный кейс | Добавить проверку `has_other_active_cases()` | `test_close_complaint_checks_other_active_cases` |
| 13 | Чат | `chat/views.py:807-811` | Race condition в offer accept/reject — нет `select_for_update` | Двойное создание заказа при конкурентных запросах | Добавить `select_for_update` на Message | `test_offer_accept_is_idempotent` |
| 14 | Финансы | `wallet/views.py:146-158` | `WithdrawalRequest` создаётся ВНЕ `transaction.atomic` | Баланс списан, но заявка не создана — деньги потеряны | Обернуть в общий `transaction.atomic` | `test_withdrawal_request_is_atomic` |
| 15 | Директор | `director/views.py:1711,1740` | `MeetingRequest.approve/reject` проверяет `role != 'admin'` вместо `role != 'director'` | Админ может одобрять встречи вместо директора | Исправить проверку роли | `test_meeting_approve_requires_director` |

---

## 3. Таблица пробелов в тестах

### Backend приложения без тестов

| Приложение | Модели | Риск | Что тестировать |
|-----------|--------|------|----------------|
| `knowledge` | Question, Answer, Article, ArticleComplaint, ArticleDeletion | **ВЫСОКИЙ** | CRUD问答, лайки, удаление/восстановление статей, жалобы |
| `payments` | Payment, AlfaBankProvider, SberPayProvider | **ВЫСОКИЙ** | Создание платежа, callback, идемпотентность, sandbox |
| `admin_panel` | Claim, SupportRequest, SupportMessage, AdminActionLog | **ВЫСОКИЙ** | Создание/закрытие тикетов, отправка сообщений, логирование |
| `notifications` | Notification, NotificationService | **СРЕДНИЙ** | Создание уведомлений, отправка email, push |
| `referal` | (empty views) | **НИЗКИЙ** | — |
| `core` | Health check, SEO | **НИЗКИЙ** | Health endpoint |
| `dashboard` | (empty views) | **НИЗКИЙ** | — |

### Сценарии без покрытия

| Сценарий | Backend unit | E2E | Playwright |
|----------|:---:|:---:|:---:|
| WebSocket chat (consumer tests) | **НЕТ** | **НЕТ** | **НЕТ** |
| Race conditions (concurrent take/approve) | **НЕТ** | **НЕТ** | **НЕТ** |
| Базовая отправка/получение сообщения в чате | **НЕТ** | — | — |
| Chat list / pagination | **НЕТ** | — | — |
| Mark as read (unmark) | **НЕТ** | — | — |
| Complaint status transitions (open→resolved→closed) | **НЕТ** | — | — |
| Article complaint/dispute flow | **НЕТ** | **НЕТ** | **НЕТ** |
| Shop moderation workflow | **НЕТ** | — | **НЕТ** |
| Role arbitrator permissions | **НЕТ** | — | — |
| Notification creation/dispatch | **НЕТ** | — | — |
| Payment providers (Sber, SberPayQR) | **НЕТ** | — | — |
| Admin support ticket lifecycle | **НЕТ** | — | — |

### Тесты по ролям

| Роль | Backend tests | Playwright |
|------|:---:|:---:|
| client | **ДА** (orders, chat, shop, knowledge) | **ДА** |
| expert | **ДА** (orders, chat, knowledge, experts) | **ДА** |
| partner | **ЧАСТИЧНО** (partner dashboard, referrals) | **ДА** |
| admin | **ДА** (arbitration, earnings) | **НЕТ** |
| director | **ДА** (director chat rooms) | **ДА** |
| arbitrator | **НЕТ** | **НЕТ** |

---

## 4. API-несостыковки frontend/backend

### Сломанные эндпоинты (404/405)

| Frontend вызов | Ожидаемый backend маршрут | Статус |
|----------------|--------------------------|--------|
| `GET /arbitrator/claims/` | **НЕ СУЩЕСТВУЕТ** | **СЛОМАН** — backend на `/arbitration/` |
| `GET /arbitrator/messages/` | **НЕ СУЩЕСТВУЕТ** | **СЛОМАН** |
| `GET /arbitrator/statistics/` | **НЕ СУЩЕСТВУЕТ** | **СЛОМАН** |
| `POST /arbitrator/claims/{id}/take/` | **НЕ СУЩЕСТВУЕТ** | **СЛОМАН** |
| `POST /arbitrator/claims/{id}/decision/` | **НЕ СУЩЕСТВУЕТ** | **СЛОМАН** |
| `POST /admin-panel/support-chats/{id}/send-message/` | DRF auto-generates `send_message` | **ВОЗМОЖНЫЙ** kebab/snake mismatch |
| `POST /admin-panel/support-requests/{id}/assign_users/` | Не зарегистрирован в urls.py | **СЛОМАН** |
| `POST /admin-panel/support-requests/{id}/add_tag/` | Не зарегистрирован в urls.py | **СЛОМАН** |
| `POST /admin-panel/support-requests/{id}/remove_tag/` | Не зарегистрирован в urls.py | **СЛОМАН** |
| `POST /admin-panel/support-requests/{id}/transfer_to_arbitration/` | Не зарегистрирован в urls.py | **СЛОМАН** |

### Несовпадения полей

| Frontend отправляет | Backend ожидает | Файл |
|---------------------|-----------------|------|
| `submit_expert_application`: `first_name`, `last_name` | `ExpertApplicationSerializer` не имеет этих полей | `users/views.py:983` |
| `createPayment`: `{order_id, amount, payment_method}` | Backend игнорирует `amount` | `payments/views.py` |

### Мёртвые эндпоинты

| Backend endpoint | Замена | Используется фронтендом? |
|-----------------|--------|--------------------------|
| `orders/accept` (deprecated) | `orders/take` | Нет |
| `orders/complete` (deprecated) | Новый endpoint | Нет |
| `apps/referal/views.py` | — | Пустой views |
| `apps/dashboard/views.py` | — | Пустой views |

---

## 5. Устаревшие/TODO/mock места

### Debug print() в продакшн (критично)

| Файл:строка | Что выводит |
|-------------|-------------|
| `users/views.py:1532` | auth_id |
| `users/views.py:1537` | cache key |
| `users/views.py:1544` | **ВСЕ ключи Redis** |
| `users/views.py:1549` | **auth data** |
| `users/views.py:1552,1557` | auth status |
| `experts/services.py:262,495` | ошибки |
| `chat/signals.py:235` | номер тикета |

### TODO (4 функциональных)

| Файл:строка | TODO |
|-------------|------|
| `knowledge/serializers.py:121,160` | Добавить аватары в author serializers |
| `users/views.py:1201` | Реализовать проверку онлайн статуса (hardcoded `False`) |
| `payments/providers/sberpay_qr.py:36` | Подтвердить эндпоинты по доке Сбера |
| `director/components/InternalCommunication/DirectorChatsSection.tsx:186,198` | Implement API call |

### Пустые CSS-заглушки (27 файлов)

Все файлы в `src/styles/landing/`, `src/styles/director/`, `src/styles/admin-dashboard/`, `src/features/expert/modals/ArbitrationModal/`, `src/features/admin/components/Sections/AdminChatsSection/`, `src/features/partner/components/PartnerTurnover/` — содержат только `/* TODO: ... */`.

### Except: pass (52+ instances)

Ключевые места:
- `chat/views.py:366,387,593,699,720,913` — потеря файлов и уведомлений
- `arbitration/views.py:266,284,384,439,543,1038` — проглатывание ошибок арбитража
- `notifications/services.py:76,89` — потеря уведомлений
- `chat/consumers.py:53,141` — ошибка WebSocket молча проглочена

### Sandbox/разработка

| Файл | Что |
|------|-----|
| `wallet/views.py:30-97` | Sandbox topup — легитимно, с guard`ом на staff |
| `config/settings.py:475` | `PAYMENTS_SANDBOX` — документировано |

---

## 6. Рекомендованный план исправлений

### Этап 1: Критичные — деньги/заказы/доступы (неделя 1)

| # | Задача | Файл |
|---|--------|------|
| 1 | Импортировать `PaymentMethod` в `payments/views.py` | `payments/views.py` |
| 2 | Исправить `submit_expert_application` — добавить `first_name`/`last_name` в serializer | `users/serializers.py` |
| 3 | Обернуть `approve` в общий `transaction.atomic` + `select_for_update` | `orders/views.py` |
| 4 | Обернуть `cancel_overdue` в общий `transaction.atomic` | `orders/views.py` |
| 5 | Обернуть `reject` в общий `transaction.atomic` | `orders/views.py` |
| 6 | Обернуть `withdraw` request creation в `transaction.atomic` | `wallet/views.py` |
| 7 | Исправить `Order.save()` — валидировать deadline ДО persist | `orders/models.py` |
| 8 | Исправить партнёрскую комиссию — использовать `final_price` | `users/signals.py` |
| 9 | Добавить `select_for_update` на Order во всех view actions | `orders/views.py` |
| 10 | Исправить role check в `MeetingRequest.approve/reject` | `director/views.py` |

### Этап 2: Чаты/unread/websocket (неделя 2)

| # | Задача | Файл |
|---|--------|------|
| 1 | Добавить проверку `is_frozen` в `ComplaintViewSet.send_message` | `arbitration/views.py` |
| 2 | Добавить `has_other_active_cases()` при unfreeze complaint | `arbitration/views.py` |
| 3 | Добавить `select_for_update` на Message в offer accept/reject | `chat/views.py` |
| 4 | Добавить idempotency key для send_message | `chat/views.py` |
| 5 | Исправить N+1 в `unread_count` — заменить на aggregate query | `chat/views.py` |
| 6 | Убрать 52+ `except: pass` — добавить logging | Все файлы |
| 7 | Создать тесты для WebSocket consumers | `chat/tests/` |

### Этап 3: Админка/арбитраж (неделя 3)

| # | Задача | Файл |
|---|--------|------|
| 1 | Создать `/api/arbitrator/` роутер или исправить фронтенд | `config/urls.py` или `arbitratorApi.ts` |
| 2 | Добавить `IsAdminUser` permission на `SupportRequestViewSet`/`ClaimViewSet` | `admin_panel/views.py` |
| 3 | Зарегистрировать недостающие actions (assign_users, add_tag, transfer) | `admin_panel/urls.py` |
| 4 | Добавить WebSocket уведомления для decision/refund/close в арбитраже | `arbitration/views.py` |
| 5 | Добавить role check в `DirectorChatRoomViewSet` actions | `director/views.py` |
| 6 | Добавить role check в `PartnerChatRoomViewSet` actions | `partners/views.py` |
| 7 | Разрешить defendant отвечать в Complaint чате | `arbitration/views.py` |

### Этап 4: UI/adaptive/dark theme (неделя 4)

| # | Задача | Файлы |
|---|--------|-------|
| 1 | Sidebar — исправить hardcoded `#ffffff` bg | `Sidebar.tsx` + `.module.css` |
| 2 | Chat UI — добавить dark theme во все CSS модули MessageModalNew | `MessageModalNew/*.module.css` |
| 3 | OrderDetail — заменить 20+ hardcoded hex на CSS vars | `OrderDetail.module.css` |
| 4 | MyWorks — заменить 30+ hardcoded hex | `MyWorks.module.css` |
| 5 | Director panel — добавить dark theme (~10% покрытие сейчас) | `director/**/*.css` |
| 6 | PartnerChats — добавить dark theme | `PartnerChatsSection.module.css` |
| 7 | PartnersMap — убрать hardcoded `background: #ffffff` | `PartnersMap.tsx` |
| 8 | Index.css — добавить dark mode base styles | `src/index.css` |
| 9 | Убрать 27 пустых CSS-заглушек или заполнить их | `src/styles/**/*.css` |

### Этап 5: Cleanup/docs (неделя 5)

| # | Задача | Файл |
|---|--------|------|
| 1 | Заменить print() на logger.debug() | 19 файлов |
| 2 | Убрать debug print() в `telegram_auth_status` | `users/views.py` |
| 3 | Убрать console.log из frontend | 65+ файлов |
| 4 | Исправить `MANUAL_FINANCE_TESTING.md` — убрать `/api/v1/` prefix | `docs/MANUAL_FINANCE_TESTING.md` |
| 5 | Исправить порт 3000 → 5173 в VK/Telegram bot коде | `vk_bot/`, `bot/` |
| 6 | Обновить `refactoring-roadmap.md` — отметить прогресс | `docs/refactoring-roadmap.md` |
| 7 | Удалить `apps/regression_tests/tests.py` (дубликаты) | `apps/regression_tests/` |
| 8 | Удалить мёртвый `OrderStatus` enum | `orders/models.py` |
| 9 | Исправить `DEPLOY.md` — `docker compose` v2 syntax | `docs/DEPLOY.md` |
| 10 | Добавить `IsPartner`/`IsDirector` permission classes | `apps/users/permissions.py` |

---

## 7. Тесты для добавления

### Backend — критичные

```python
# 1. Финансовая атомарность
test_approve_releases_funds_and_updates_status_atomically
test_cancel_overdue_refunds_and_updates_status_atomically
test_reject_refunds_and_updates_status_atomically

# 2. Payment callback
test_callback_with_valid_payment_method_does_not_crash
test_callback_signature_verification_works

# 3. Expert application
test_expert_application_with_first_name_last_name

# 4. Race conditions
test_concurrent_take_order_only_one_succeeds
test_concurrent_approve_only_one_releases

# 5. Partner commission
test_partner_commission_uses_final_price_not_budget

# 6. Withdrawal
test_withdrawal_request_created_atomically_with_balance_debit

# 7. Meeting permissions
test_meeting_approve_requires_director_role
```

### Backend — высокие

```python
# 8. Chat
test_send_message_to_frozen_chat_returns_400
test_complaint_message_respects_frozen_chat
test_mark_as_read_updates_unread_count
test_chat_list_returns_visible_chats

# 9. Knowledge (0 тестов сейчас)
test_create_question
test_add_answer
test_like_answer
test_create_article
test_delete_article
test_article_dispute_flow

# 10. Complaint lifecycle
test_complaint_status_transitions
test_close_complaint_checks_other_active_complaints

# 11. Admin panel
test_support_request_create
test_support_request_send_message
test_claim_take_in_work
```

### Playwright E2E — новые

```typescript
// 12. Арбитратор
test('arbitrator can list claims')
test('arbitrator can take case in work')
test('arbitrator can make decision')

// 13. Чат
test('user can send and receive message')
test('unread count updates in real-time')
test('banned user cannot send message')

// 14. Admin
test('admin can manage support requests')
test('admin can view financial data')
```

---

## 8. Конкретные баги с файлами

| # | Баг | Файл:строка |
|---|-----|-------------|
| 1 | `PaymentMethod` NameError | `apps/payments/views.py:95,100` |
| 2 | `/arbitrator/` → 404 | `frontend-react/src/features/arbitrator/api/arbitratorApi.ts` |
| 3 | `first_name` KeyError | `apps/users/views.py:983-986` |
| 4 | Non-atomic approve | `apps/orders/views.py:713,720-721` |
| 5 | Non-atomic cancel | `apps/orders/views.py:465,473-74` |
| 6 | Non-atomic reject | `apps/orders/views.py:800,808-809` |
| 7 | Debug prints leak | `apps/users/views.py:1532-1557` |
| 8 | Deadline validated after save | `apps/orders/models.py:218-223` |
| 9 | Partner commission wrong base | `apps/users/signals.py:29` |
| 10 | Partner wallet failure swallowed | `apps/users/signals.py:78-83` |
| 11 | Frozen chat bypass | `apps/arbitration/views.py:1027` |
| 12 | Complaint unfreeze no check | `apps/arbitration/views.py:873-880` |
| 13 | Offer accept race condition | `apps/chat/views.py:807-811` |
| 14 | Withdrawal non-atomic | `apps/wallet/views.py:146-158` |
| 15 | Meeting role check wrong | `apps/director/views.py:1711,1740` |
| 16 | Duplicate UserUpdateSerializer | `apps/users/serializers.py:189-269` |
| 17 | N+1 unread_count | `apps/chat/views.py:1039` |
| 18 | 52+ except: pass | Множество файлов |
| 19 | 27 пустых CSS-заглушек | `src/styles/**/*.css` |
| 20 | SupportRequest permission bypass | `apps/admin_panel/views.py:855-871` |
| 21 | AllowAny notification emails | `apps/notifications/views.py:55,90` |
| 22 | Shop partner commission fires before hold | `shop/views.py:148-160` |
| 23 | File delete reverts order status | `apps/orders/views.py:1222-1228` |
| 24 | Auto-ban permanent (no expiry) | `apps/chat/services.py:234-239` |
| 25 | Defendant can't respond in Complaint | `apps/arbitration/views.py:1013` |

---

## 9. Команды проверки

### Минимальный набор (после изменений)

```bash
# Backend system check
docker compose exec backend python manage.py check

# Backend tests
docker compose exec backend python manage.py test --verbosity=2

# Frontend typecheck
cd frontend-react && npx tsc --noEmit

# Frontend build
cd frontend-react && npm run build
```

### Полный набор

```bash
# 1. Backend system check + migrations
docker compose exec backend python manage.py check
docker compose exec backend python manage.py migrate --check

# 2. Backend tests (all)
docker compose exec backend python manage.py test --verbosity=2

# 3. Backend tests (только критичные)
docker compose exec backend python manage.py test orders.tests_finance --verbosity=2
docker compose exec backend python manage.py test arbitration.tests --verbosity=2
docker compose exec backend python manage.py test chat.tests --verbosity=2
docker compose exec backend python manage.py test wallet.tests --verbosity=2

# 4. Frontend typecheck + lint
cd frontend-react
npx tsc --noEmit
npm run lint

# 5. Frontend build
npm run build

# 6. Playwright API tests
npx playwright test --project=api

# 7. Playwright browser tests
npx playwright test --project=browser

# 8. Docker smoke test
docker compose ps
docker compose logs --tail=50 backend
docker compose logs --tail=50 postgres
```

---

## 10. Покрытие тёмной темой

| Панель/Страница | Покрытие | Статус |
|----------------|----------|--------|
| Wallet | **100%** | Отлично |
| Landing FAQ | **100%** | Отлично |
| Partner Dashboard | **70%** | Хорошо |
| Partner Program | **60%** | Хорошо |
| Admin (часть секций) | **40%** | Частично |
| Knowledge Portal | **30%** | Плохо |
| Chat (MessageModalNew) | **10%** | Критично |
| OrderDetail | **10%** | Критично |
| MyWorks | **5%** | Критично |
| Sidebar | **0%** | Сломано |
| Director panel | **10%** | Критично |
| PartnerChats | **0%** | Сломано |
| PartnerMap | **0%** | Сломано |
| Index.css base | **0%** | Сломано |
