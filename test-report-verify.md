# Отчёт по верификации: разморозка чатов + флоу претензий

**Коротко:**
- **A. Разморозка — работает корректно.** Админ размораживает **все** чаты пользователя одним действием, после этого клиент пишет в каждом из них.
- **B. Претензия — основной флоу работает** (подача + отображение у клиента и у админа/арбитратора). Найдено **2 проблемы**:
  - **B.7 (настоящий баг):** повторная подача претензии по тому же заказу возвращает 201 и создаёт вторую арбитражную запись — дедупа нет. Пользователь ранее сообщал «при нажатии на кнопку подать снова вылезает ошибка, что уже был подан» — похоже, ровно этот кейс.
  - **B.6 (известное структурное ограничение):** арбитражное дело не появляется в `/api/admin-panel/claims/` — это отдельная сущность от `admin_panel.Claim`, и админский виджет `useTickets` пока не тянет `arbitration/cases/`. Поэтому «в админке претензии нет» из жалобы заказчика — подтверждается на уровне админ-дашборда (но полная арбитражная админка по `/api/arbitration/cases/` дело видит).

Формат проверки — шелл+API (Chrome в этом окружении стабильно не поднимался; оба вопроса — чисто про состояние БД и поведение API, видео бы не добавило сигнала).

Pre-state (сид): `client.one` (id=3) забанен за контакты (is_banned_for_contacts=True, contact_ban_until=+7d), два чата с его участием заморожены — `chat_order` (id=1, по заказу с expertone) и `chat_direct` (id=2, прямой с directoruser).

---

## Тест A — «Разморозка применяется ко ВСЕМ чатам»

| # | Проверка | Ожидание | Результат |
|---|---|---|---|
| A.1 | client.one → POST `/chat/chats/1/send_message/` | 400, "временно недоступна" | **PASS** (400, detail корректен) |
| A.2 | client.one → POST `/chat/chats/2/send_message/` | 400, "временно недоступна" | **PASS** (400, detail корректен) |
| A.3 | admin → POST `/users/3/unfreeze_chats/` | 200 | **PASS** (200) |
| A.4 | admin-список чатов `is_frozen=false` | false | **N/A** (admin не участник этих чатов → отфильтрованы из его queryset; покрывается A.9) |
| A.5 | то же для chat2 | false | **N/A** (см. выше) |
| A.6 | БД: `client.is_banned_for_contacts` | False | **PASS** |
| A.7 | client → POST `/chat/chats/1/send_message/ {text:"post-unfreeze-1"}` | успешно | **PASS** (200, text сохранён) |
| A.8 | client → POST `/chat/chats/2/send_message/ {text:"post-unfreeze-2"}` | успешно | **PASS** (200, text сохранён) |
| A.9 | client → GET `/chat/chats/` — оба чата, is_frozen=false | оба false | **PASS** (chat1.is_frozen=false, chat2.is_frozen=false) |

**Вывод A: после одного админского unfreeze_chats оба чата размораживаются и клиент пишет в каждом.** То, о чём спрашивал заказчик — работает.

Доп. наблюдение (не баг): `contact_ban_until` и `contact_ban_reason` у пользователя не очищаются (гард `send_message` смотрит только на `is_banned_for_contacts`, так что на поведение не влияет; но в БД остаётся «хвост»).

---

## Тест B — «Флоу претензии»

Ручка фронта: `POST /api/arbitration/cases/submit-claim/` → создаёт `ArbitrationCase`.

| # | Проверка | Ожидание | Результат |
|---|---|---|---|
| B.1 | client.one → submit-claim (order_id=1, reason=deadline_violation) | 201 + case_number | **PASS** (`ARB-2YLOIHZC`) |
| B.2 | client.one → GET `/arbitration/cases/my-cases/` | содержит дело | **PASS** |
| B.3 | client support-center (ветка `my-cases`) | содержит дело | **PASS** |
| B.4 | admin → GET `/arbitration/cases/` | содержит дело | **PASS** |
| B.5 | admin → GET `/arbitration/cases/<id>/` | 200, case_number совпадает | **PASS** |
| B.6 | admin → GET `/admin-panel/claims/` | арбитражное дело отсутствует (это **другая** сущность) | **INFO — подтверждено**: дела действительно нет. Админская таблица «обращений» в дашборде не тянет `arbitration/cases/` → клиент видит дело в своём центре, а админ в главном виджете — не видит. Это ровно та жалоба «в админке претензии нет» |
| B.7 | повторный submit того же order_id | 400/409 (дедуп) | **FAIL — 201**: создаётся ВТОРАЯ запись `ARB-TCAW0ER1`. Дедупа нет |

**Вывод B:** подача и отображение у клиента + арбитражной админки — работает. Два расхождения: B.7 (баг — нет дедупа) и B.6 (структурный разрыв между арбитражем и admin_panel, который нужно закрывать мёржем listов в `useTickets`).

---

## Evidence

Полный лог запуска: `/tmp/verify_run.log` (160 строк, все HTTP-запросы + bodies).
Скрипт: `/tmp/verify_flow.py`.
Сид-скрипт: `/tmp/seed_verify.py`.

Ключевые ответы:
- `POST /users/3/unfreeze_chats/` → `200 OK` (admin)
- Клиентский `GET /chat/chats/` до: оба `is_frozen=true`. После: оба `is_frozen=false`.
- `POST /chat/chats/1/send_message/` до → 400 `"Отправка сообщений временно недоступна..."`; после → 200 `{id, text: "post-unfreeze-1", ...}`.
- `POST /arbitration/cases/submit-claim/` → 201 + `{case_number: "ARB-2YLOIHZC"}`. Второй вызов с тем же order_id → 201 + `{case_number: "ARB-TCAW0ER1"}` — второе дело.
