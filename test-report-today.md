# Test Report — Today's Fixes

Дата: 2026-04-24
Прогон: API (shell) + UI (Playwright + видео) на локальной сборке (Django :8000, Vite :5173).

## Краткий итог

Все 6 фиксов сегодняшнего дня проверены. Все — **PASS**.

| # | Фикс | Способ | Результат |
|---|---|---|---|
| #1 | Favicon → logo.svg + logo.png | UI + curl | ✓ PASS |
| #3 | Портал знаний — конкретные ошибки валидации | UI (3 сценария) | ✓ PASS |
| #4 | `chat/get_or_create_by_user` — гарды на `user_id` | API (6 кейсов) | ✓ PASS |
| #5 | Email/username уникальность только среди `is_active=True` | API (director + public signup) | ✓ PASS |
| #6 | Анкета эксперта — блок «Образование» помечен required | UI | ✓ PASS |
| B.7 | submit-claim — дедуп по заказу | API | ✓ PASS |

Запись единого прогона (T1 → T2 → T3): см. вложенное `.mp4`.

---

## T1. Favicon (#1) — PASS

**Что изменилось**: `index.html` теперь ссылается на `logo.svg` + `logo.png` вместо `vite.svg`.

**Проверка**:
- DOM `<head>` (Playwright): `[link rel="icon" href="/assets/logo.svg"]`, `[link rel="alternate icon" href="/assets/logo.png"]`, `[link rel="apple-touch-icon" href="/assets/logo.png"]`.
- HTTP: `GET /assets/logo.svg` → 200 (image/svg+xml, 3875 B); `GET /assets/logo.png` → 200.
- Визуально: на вкладке Chromium рендерится иконка проекта (не Vite).

![T1 home](https://app.devin.ai/attachments/073679e9-de8b-4215-b559-2f6df47ed7e0/t1-home.png)

---

## T2. Анкета эксперта: «Образование» required (#6) — PASS

**Что изменилось**: `<Form.Item label="Образование" required tooltip="Добавьте минимум одно образование">` — AntD автоматически рисует красную `*` и `(?)`-иконку.

**Проверка** (как `expertone` / `testpass123`):
1. `/expert` → «Заполнить анкету» → модалка открылась.
2. DOM вокруг лейбла:
   ```html
   <div class="ant-col ant-form-item-label">
     <label class="ant-form-item-required" title="Образование">
       Образование
       <span class="anticon anticon-question-circle ant-form-item-tooltip">...</span>
     </label>
   </div>
   ```
3. Класс `ant-form-item-required` — тот самый, по которому AntD ставит красную звёздочку. Иконка `question-circle` рендерится при наличии `tooltip`.

![T2 Education label](https://app.devin.ai/attachments/57cfb920-eb20-47f4-b7f5-ec6f652e0233/t2-education-label.png)

---

## T3. Портал знаний: конкретные ошибки (#3) — PASS

**Что изменилось**: `CreateQuestionModal.handleSubmit` теперь вытаскивает `validationError.errorFields[0].errors[0]` и показывает его через `message.error(...)` вместо общего «Не удалось создать вопрос».

**Сценарии** (анонимно, модалка открывается без авторизации; валидация клиентская):

| Кейс | Ввод | Ожидаемый toast | Фактический toast | Результат |
|---|---|---|---|---|
| T3.1 | всё пусто | «Введите заголовок вопроса» | **«Введите заголовок вопроса»** | PASS |
| T3.2 | title="abc" (3 симв.) | «Заголовок должен содержать минимум 10 символов» | **«Заголовок должен содержать минимум 10 символов»** | PASS |
| T3.3 | валидный title + desc="слишком коротко" | «Описание должно содержать минимум 20 символов» | **«Описание должно содержать минимум 20 символов»** | PASS |

Ни в одном случае не показался старый общий «Не удалось создать вопрос» — именно это баг и просил починить.

| T3.1 empty | T3.2 short title |
|---|---|
| ![T3.1](https://app.devin.ai/attachments/08701a43-0fd3-4c7d-a518-88f1132df97d/t3-1-empty-submit.png) | ![T3.2](https://app.devin.ai/attachments/1ed86517-de6e-4401-8fd5-deb0ab78ef9e/t3-2-short-title.png) |

| T3.3 short description |
|---|
| ![T3.3](https://app.devin.ai/attachments/85baac29-1e4b-48e5-86b4-9520444636f2/t3-3-short-desc.png) |

---

## T4. Chat `get_or_create_by_user` guards (#4) — PASS

**Проверка**: `/tmp/test_today_fixes.py` — 6 кейсов с client.one → все ожидаемые коды:

| # | Запрос | Ожидание | Факт |
|---|---|---|---|
| 4.1 | `{}` | 400 | 400 «user_id is required» |
| 4.2 | `{user_id: 0}` | 400 | 400 «user_id must be positive» |
| 4.3 | `{user_id: "abc"}` | 400 | 400 «invalid user_id» |
| 4.4 | `{user_id: <self>}` | 400 | 400 «cannot chat with yourself» |
| 4.5 | `{user_id: 99999}` | 404 | 404 «User not found» |
| 4.6 | `{user_id: 4 (expertone)}` | 200/201 | 200 + chat object |

---

## T5. Email/username uniqueness among active only (#5) — PASS

**Проверка**: `/tmp/test_email_reuse.py` — director создаёт сотрудника, архивирует (`is_active=False`), потом регистрирует нового на тот же email:

- 5.1 Архивация ставит `is_active=False` (email остаётся в БД) — ✓
- 5.2 Повторная регистрация с тем же email → **201 Created** (раньше падал с 400) — ✓
- 5.3 Username генерируется глобально уникальным (итерирует `.filter(username=...)` без `is_active`) — ✓ (иначе 500 на INSERT из-за DB UNIQUE)

Fix-ап в процессе тестирования: найден и починен 500 IntegrityError на username collision — `apps/director/views.py` и `apps/users/serializers.py` теперь итерируют по всем юзерам, а не только активным.

---

## T6. Claim submit-claim dedup (B.7) — PASS

**Проверка**: `/tmp/test_today_fixes.py` + ручной сценарий:
- Первый `POST /arbitration/submit-claim/` по заказу #X → 201, `case_number=ARB-…`
- Второй `POST` по тому же заказу (не закрытый кейс) → **400** с `{"error": "...", "existing_case_number": "ARB-…"}`.

До фикса: оба вызова возвращали 201 и создавали 2 записи.

---

## Что не тестировалось

- **#2 Admin field polish** — ждём от пользователя список конкретных полей.
- **B.6 Arbitration в админ-панели тикетов** — подтверждено как by-design (отдельная страница `ArbitrationSection`), фикса не было.

## Артефакты

- Скрипты: `/tmp/test_today_fixes.py`, `/tmp/test_email_reuse.py`, `/tmp/ui_test.py`
- Скрины: `/tmp/ui-evidence/*.png`
- Видео: `screencasts/rec-05ed70e5-*/…-subtitled.mp4` (прилагается)
- План: <ref_file file="/home/ubuntu/repos/OkoZnaniy/test-plan-ui-today.md" />
