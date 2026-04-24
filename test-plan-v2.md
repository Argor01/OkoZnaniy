# OkoZnaniy — Test Plan v2

Application stack: Django (`127.0.0.1:8000`) + Vite React (`127.0.0.1:5173`).
Test users (password `testpass123`): `adminuser`, `directoruser`, `client.one`, `expertone`.
Seeded: Order #2, Chat #1 (frozen, between client.one ↔ expertone), Claim #1 ticket `H2X3OKN45Z8IDTMR` with reason=`contact_violation`.

---

## R1 — Regression: contact-ban 500 (already fixed locally)

**Path**: Admin LK → «Баны за контакты» → row with a banned user → click action (Разбанить / Заблокировать).

**Pass**:
- Network: `PATCH /api/users/<id>/ban_for_contacts/` returns **200** (previously 500).
- Response JSON has `{ "user": { "contact_ban_active": <bool>, ... } }`.
- Row in table reflects new status within 2 s without manual F5.

**Fail if**: 500 appears; row doesn't update; or Ant-Design error toast reads `Не удалось …`.

Evidence from code: <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/apps/users/views.py" lines="1036-1131" />.

---

## R2 — #4 User profile resolves by id and username

**Path**: Admin LK → открыть карточку заказа #2 → кликнуть по имени клиента (`/user/4` or `/user/client.one`).

**Pass**:
- `GET /api/users/4/` → 200, JSON contains `"username":"client.one"`.
- `GET /api/users/client.one/` → 200, JSON contains `"id":4`.
- Page header shows "client.one" (not «Пользователь не найден»).

**Fail if**: 500 / 404 on either request, or page shows "Пользователь не найден".

Evidence from code: <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/apps/users/views.py" lines="80-101" />.

---

## T1 — #1/#2 Contact-violation buttons on ticket detail

**Path**: admin LK → «Арбитраж / Обращения» → тикет `H2X3OKN45Z8IDTMR` (reason=`contact_violation`).

**Pass** — на странице тикета видны **три** кнопки:
1. «Разморозить чат» → `POST /api/users/4/unfreeze_chats/` returns 200; чат #1 становится `is_frozen=False`.
2. «Заблокировать пользователя» → `PATCH /api/users/4/ban_for_contacts/` with `{active:true,permanent:true}` returns 200.
3. «Заблокировать на период» → открывает модалку с выбором периода; submit → `PATCH …/ban_for_contacts/` with `ban_until=<iso>` returns 200.

**Fail if**: хотя бы одной кнопки нет, или после клика получаем 400/500, или чат остаётся замороженным / бан не применился в БД.

Evidence: <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/frontend-react/src/features/admin/pages/TicketDetailPage.tsx" lines="576-602" />.

---

## T2 — #3 Messages load in client LK

**Path**: логин `client.one` → верхний сайдбар → иконка «Сообщения» → модалка сообщений открывается.

**Pass**:
- Слева список чатов содержит хотя бы один чат с `expertone`.
- Клик по чату → справа грузится список сообщений; seeded Chat #1 содержит `msg 1 / msg 2 / msg 3`.
- Network: `GET /api/chat/chats/` 200; `GET /api/chat/chats/<id>/messages/` 200.

**Fail if**: список чатов пустой при наличии seed; клик по чату не подгружает сообщения; 4xx/5xx в сети.

---

## T3 — #5 Claim submit flow

**Path**: логин `client.one` → заказ #2 → кнопка «Подать претензию» → форма ComplaintForm → submit.

**Pass**:
- Первый submit: ant-toast «Претензия подана. Открываю центр обращений.» в пределах 3 с.
- Переадресация на `/support` → в списке появляется карточка типа `arbitration_case` с только что созданным `case_number`.
- Admin LK (`adminuser`) → «Обращения» — эта претензия видна в общем списке.
- Повторный submit для того же заказа: корректное сообщение (не 404).

**Fail if**: любое уведомление с кодом 404; претензия не видна у клиента; не видна в админке.

---

## T4 — #6 «Перейти в заказ» из чата

**Path**: логин `client.one` → модалка сообщений → seeded Chat #1 → в панели заказа справа кнопка «Перейти в заказ».

**Pass**:
- URL меняется на `/orders/2`.
- Модалка сообщений закрывается (нет `role="dialog"` поверх страницы).
- Рендерится полноценная страница заказа #2 (заголовок, описание, участники).

**Fail if**: модалка остаётся видна после клика; URL не меняется; или открывается другая модалка вместо перехода.

Evidence: <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/frontend-react/src/features/expert/modals/MessageModalNew.tsx" lines="2250-2265" />.

---

## T5 — #7 Admin «поля поправить» (триаж)

**Path**: логин `adminuser` → «Управление заказами», «Баны за контакты», «Блокировка» — по каждой странице собираю:
- неверные лейблы / плейсхолдеры,
- поля, которые не сохраняются,
- поля read-only, которые должны редактироваться (и наоборот),
- ошибки валидации, расхождение с серверной моделью.

Фиксю только однозначные баги (не перекраску / не ux-префы). Неоднозначные — документирую в репорте.

---

## T6 — #8 Director LK: «Обмен контактами» table refresh

**Path**: логин `directoruser` → «Обмен контактами» → любой юзер с `contact_ban_active=false` → «Заблокировать».

**Pass**:
- Ant-toast об успехе появляется в пределах 2 с.
- Без F5 в строке меняется статус/тег (например, красный «Заблокирован»).
- Network: тот же `PATCH /api/users/<id>/ban_for_contacts/` → 200.

**Fail if**: таблица не перерисовывается до F5 (подтверждает баг); 4xx/5xx на PATCH.

---

## Reporting

- Один continuous recording, аннотации на каждый тест (`test_start` / `assertion`).
- Для каждого теста — pass/fail/inconclusive с конкретным HTTP-кодом и скриншотом.
- Если какой-то сценарий я не смогу прогнать (auth, data), отмечаю `untested` явно — не гадаю.
