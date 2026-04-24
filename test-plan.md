# Test Plan — OkoZnaniy bug-fix batch

Scope: verify the 3 already-committed backend fixes and reproduce/fix the 6 remaining user-reported bugs. Record each test with annotations. For every bug I expect to fix, the plan includes both a **repro step (pre-fix)** and a **verify step (post-fix)** — the same action should flip from failing to passing.

Env: Django `http://localhost:8000`, Vite `http://localhost:5173`. Seeded users (password `testpass123`): `adminuser`, `directoruser`, `client.one`, `expertone`. Seeded order #2 + chat #1 (3 messages) + claim #1.

---

## R1 — Regression: contact-ban actions (original 500)

Files: `apps/users/views.py` — `ban_for_contacts`, `unban_for_contacts`, `unfreeze_chats`, `_resolve_contact_ban_user`.

**Steps**
1. Login as `adminuser`, go to admin panel → «Баны за контакты».
2. Click «Заблокировать» on `client.one` row (or «Разблокировать» if already banned).

**Assertions**
- Network tab: `PATCH /api/users/<id>/ban_for_contacts/` → **status 200** (pre-fix this was 500).
- Response JSON contains `"user"` key with `is_banned_for_contacts === true` after ban / `false` after unban.
- UI toast shows «забанен»/«разбанен».

A broken implementation returns 500 and the toast says error.

---

## R2 — #4: User profile lookup from order card

Files: `apps/users/views.py` — `retrieve`, `get_object`, `lookup_value_regex`.

**Steps**
1. Navigate to `http://localhost:5173/user/4` (numeric id of `client.one`).
2. Navigate to `http://localhost:5173/user/client.one` (username with a dot).

**Assertions**
- Both pages render profile with `first_name: Ivan`, `last_name: Client`.
- Network: `GET /api/users/4/` → 200; `GET /api/users/client.one/` → 200.

A broken implementation shows «Пользователь не найден» or 404.

---

## T1 — #1/#2: Ticket detail — contact_violation buttons

Files: `frontend-react/src/features/admin/pages/TicketDetailPage.tsx` L576-600 (already coded, need UI confirmation).

**Steps**
1. Create a ticket with `reason=contact_violation` for seeded order (via Django shell or admin create flow).
2. Login as `adminuser`, open that ticket detail page.

**Assertions**
- Right sidebar shows exactly three buttons: «Разморозить чат», «Заблокировать пользователя», «Заблокировать на период».
- Click «Разморозить чат»: `POST /api/users/<defendant_id>/unfreeze_chats/` fires → 200; toast «Чат разморожен».
- Click «Заблокировать пользователя»: PATCH ban_for_contacts → 200; user's `is_banned_for_contacts → true`.
- «Заблокировать на период» opens a modal with period select.

Broken impl: buttons missing OR clicking returns 500 OR toast shows error.

---

## T2 — #3: Client LK — messages not loading

Files: `frontend-react/src/features/layout/components/DashboardLayout.tsx` + `MessageModalNew.tsx`; seeded Chat #1 has 3 messages.

**Steps**
1. Login as `client.one`.
2. Click the messages/chat icon (envelope) in the dashboard.

**Assertions**
- Network: `GET /chat/chats/` → 200 with `length ≥ 1` (the seeded chat).
- Click the chat with `expertone` → messages panel shows messages whose `text` values are `msg 1`, `msg 2`, `msg 3`.

Broken impl: empty list / infinite spinner / 401 / no messages rendered.

---

## T3 — #5: Claim submission from order

Files: `frontend-react/src/features/orders/pages/ComplaintForm/index.tsx`; `apps/arbitration/` submit endpoint.

**Steps**
1. Login as `client.one`, navigate `/orders/2` → click «Подать жалобу».
2. Fill required fields in ComplaintForm, submit.
3. After redirect, open `/support` (or claims list).
4. Press «Подать» again on the same order.

**Assertions**
- Submit 1: POST → **2xx**; frontend shows success toast within 3s; network tab has NO 404 after the submit.
- Claim visible in client's claims list after submit 1.
- Submit 2 (same order): shows «уже подана» error **WITHOUT 404** (currently both happen together).
- Admin side: same claim appears in admin claims list.

Broken impl: 404 on submit, no success toast, missing from lists.

---

## T4 — #6: Client chat → «Перейти в заказ»

Files: `frontend-react/src/features/expert/modals/MessageModalNew.tsx` L2250-2265 `handleGoToOrder`.

**Steps**
1. Login as `client.one`, open messages modal, select chat with `expertone`.
2. Click «Перейти в заказ».

**Assertions**
- URL changes to exactly `/orders/2` (not `/messages` or `/support` or back to chat).
- OrderDetail renders with visible order title «Test order».
- Message modal closes (not visible).

Broken impl: stays on messages, or re-opens modal, or navigates to wrong page.

---

## T5 — #7: Admin fields polish (triage)

**Steps**
1. Login as `adminuser`, walk through: «Управление заказами», «Баны за контакты», «Блокировка».
2. Document specific field/UX defects (e.g. misaligned columns, wrong placeholder, form not resetting, validation not firing).

**Assertions**
- Concrete findings listed; anything subjective escalated to user before coding change.

---

## T6 — #8: Director LK — contact bans table refresh

Files: `ContactBannedUsers` component used by both admin & director; likely fixed by R1 (successful PATCH now triggers `invalidateQueries`).

**Steps**
1. Login as `directoruser`, open «Обмен контактами».
2. Click «Заблокировать» on `client.one`.
3. Observe table without manual reload.

**Assertions**
- After click: PATCH → 200.
- Table row updates to show banned status within 2s, NO manual F5 required.
- `contact_violations_count` cell increments.

Broken impl: status doesn't change until refresh.

---

## Evidence to capture

For each test: screenshot before action, screenshot after, network panel showing endpoint status, console free of red errors. Single continuous recording with annotations for each test id.
