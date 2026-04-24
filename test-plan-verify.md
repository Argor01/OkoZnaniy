# Тест-план (API): разморозка чатов и флоу претензий

**Формат**: все проверки через HTTP API (JWT-токены на `POST /api/users/token/`). Без UI/видео — GUI в окружении не запускается, но оба заданных вопроса полностью проверяемы на бэкенде (после разморозки меняется состояние БД + изменяется поведение send_message; после submit_claim создаётся запись, видимая списками my-cases и admin).

## Пред-состояние (seed уже применён)

- `adminuser` (role=admin), `directoruser` (role=director), `client.one` (role=client, id=3), `expertone` (role=expert, id=4). Пароль у всех `testpass123`.
- Два чата с участием client.one: `chat_order` (id=1, по заказу с expertone) и `chat_direct` (id=2, прямой с directoruser). Оба `is_frozen=True`.
- `client.one`: `is_banned_for_contacts=True`, `contact_ban_until = now + 7 days`, `contact_ban_reason = "Тест: обмен контактами"`.

---

## Тест A — Разморозка применяется ко ВСЕМ чатам пользователя

Код: `unfreeze_chats` в `apps/users/views.py:1161` фильтрует `Chat.objects.filter(Q(client=user) | Q(expert=user), is_frozen=True)` и зовёт `chat.unfreeze()` для каждого + снимает `is_banned_for_contacts`. Блокировка send_message в `apps/chat/views.py:146,158,169` — по трём условиям.

**Шаги + pass-критерии:**

| # | Действие | Ожидание (fail если иначе) |
|---|---|---|
| A.1 | client.one → `POST /api/chat/chats/1/send_message/` `{text:"pre-unfreeze-1"}` | HTTP 400; body.`detail` начинается с "Отправка сообщений временно недоступна"; body.`frozen=true` |
| A.2 | client.one → `POST /api/chat/chats/2/send_message/` `{text:"pre-unfreeze-2"}` | HTTP 400; body.`detail` такой же формулировки; body.`frozen=true` |
| A.3 | adminuser → `POST /api/users/3/unfreeze_chats/` | HTTP 200; body.`message` содержит «разморожен» |
| A.4 | adminuser → `GET /api/chat/chats/1/` | body.`is_frozen` **равно** `false` (строго) |
| A.5 | adminuser → `GET /api/chat/chats/2/` | body.`is_frozen` **равно** `false` |
| A.6 | Напрямую из БД: `User.objects.get(id=3).is_banned_for_contacts` | `False` |
| A.7 | client.one → `POST /api/chat/chats/1/send_message/` `{text:"post-unfreeze-1"}` | HTTP 201; body.`id` — новый; `text="post-unfreeze-1"` |
| A.8 | client.one → `POST /api/chat/chats/2/send_message/` `{text:"post-unfreeze-2"}` | HTTP 201; body.`id` — новый; `text="post-unfreeze-2"` |
| A.9 | client.one → `GET /api/chat/chats/` | оба чата (1, 2) присутствуют; у обоих `is_frozen=false` |

**Если хотя бы ОДИН из A.7/A.8/A.9 отдаёт 400 / is_frozen=true — это ровно тот кейс, который просил проверить заказчик: «не все чаты разморожены».**

Информативная проверка (не fail): после разморозки поле `contact_ban_until` у клиента остаётся заполненным (код `unfreeze_chats` его намеренно не очищает). На send_message не влияет, потому что guard смотрит на `is_banned_for_contacts`.

---

## Тест B — Сквозной флоу претензии

Код: `apps/arbitration/views.py:228` `submit_claim` создаёт `ArbitrationCase`, вызывает `case.submit()` и `freeze_case_context(case)`. Клиентский UI тянет претензию через `listAll()` в `frontend-react/src/features/support/api/requests.ts:84` — мёржит `support-requests` + `claims` + `arbitration/cases/my-cases/`. Админский список `useTickets` (`frontend-react/src/features/admin/hooks/useAdminTickets.ts:8`) мёржит только `support-requests` + `claims` (без арбитража) — это структурное ограничение, которое фиксируем как known gap.

**Шаги + pass-критерии:**

| # | Действие | Ожидание |
|---|---|---|
| B.1 | client.one → `POST /api/arbitration/cases/submit-claim/` с минимальным валидным body (`order_id=1`, `subject`, `reason`, `description`, `refund_type='none'`) | HTTP 201; body.`case_number` непустой; `status` ∈ {"submitted","under_review"} |
| B.2 | client.one → `GET /api/arbitration/cases/my-cases/` | массив содержит запись с `case_number` из B.1 |
| B.3 | Эмуляция «списка обращений клиента» — параллельно GET `/api/admin-panel/support-requests/`, `/api/admin-panel/claims/`, `/api/arbitration/cases/my-cases/` под client.one | объединённый список содержит дело из B.1 (через endpoint арбитража) |
| B.4 | adminuser → `GET /api/arbitration/cases/` (лист) | массив содержит запись с `case_number` из B.1 |
| B.5 | adminuser → `GET /api/arbitration/cases/<id>/` | HTTP 200; `case_number` совпадает |
| B.6 | adminuser → `GET /api/admin-panel/claims/` | запись из B.1 **отсутствует** (known gap: admin panel claims ≠ arbitration cases) — логируем как info, не fail |
| B.7 | client.one → повторно `POST /api/arbitration/cases/submit-claim/` с теми же параметрами | HTTP 400 или 409; текст ошибки упоминает «уже»/«открытая» |

**Если B.1 возвращает 404 — это в точности изначальный баг #5 («после подачи претензии 404»).** Если B.2/B.3 пусты — клиент не видит своё дело (тоже кейс из тикета). Если B.4/B.5 fail — админ/арбитратор не видит (тоже кейс).

---

## Сбор улик

- Все HTTP response body (status + body) сохраняем в `/tmp/verify_output.txt`.
- Для A.6 — прямой запрос в Django shell.
- Отчёт — один markdown-файл с таблицей результатов; отправляется пользователю.
