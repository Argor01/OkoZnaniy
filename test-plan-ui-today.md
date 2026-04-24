# UI Test Plan — Today's Fixes (verify visual/behavioral part)

Scope: three changes made today that weren't yet UI-tested. API-testable fixes (#4 chat guards, #5 email reuse, B.7 claim dedup) are already covered by `/tmp/test_today_fixes.py` + `/tmp/test_email_reuse.py` (all PASS in shell).

Single continuous Chrome recording. All steps must produce an observable difference vs. the broken baseline.

---

## T1. Favicon replaced (#1)

**Baseline (broken)**: `<link rel="icon" href="/vite.svg">` → tab icon is Vite's purple/blue lightning.
**Expected (fixed)**: `<link rel="icon" href="/assets/logo.svg">` + `apple-touch-icon=/assets/logo.png` → tab icon is the project logo (`logo.svg`, 3875 bytes, verified 200 OK at that path).

**Steps**:
1. Open `http://127.0.0.1:5173/` in Chrome (fresh tab, hard reload `Ctrl+Shift+R` to bypass cache).
2. Observe the browser tab icon.
3. Right-click tab → View Page Source (or open DevTools → Elements tab → search `<link rel="icon"`).

**Pass**:
- T1.a Tab icon renders the project logo (NOT the Vite lightning). Screenshot shows custom icon in the tab.
- T1.b DOM `<head>` contains `<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">` AND `<link rel="apple-touch-icon" href="/assets/logo.png">` (verified via DevTools or curl of /).
- T1.c `curl http://127.0.0.1:5173/assets/logo.svg` → 200 with Content-Type image/svg+xml (already verified pre-test: 200, 3875 B).

**Fail if**: tab still shows Vite lightning OR DOM still points to `/vite.svg`.

---

## T2. Education block shows required marker (#6)

**Baseline (broken)**: `<Form.Item label="Образование">` (no `required`) → no red `*` next to label, user has no visual cue that section is mandatory until they submit and a generic validation toast fires.
**Expected (fixed)**: `<Form.Item label="Образование" required tooltip="Добавьте минимум одно образование">` → red `*` before/after label + `(?)` tooltip icon (see <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/frontend-react/src/features/expert/modals/ApplicationModal.tsx" lines="457" />).

**Steps** (as `expertone` / `testpass123`):
1. Login as `expertone`.
2. Navigate to `/expert` (ExpertDashboard). The dashboard prompts the user to fill out their application since `has_submitted_application=False`.
3. Click the "Заполнить анкету" / application CTA to open `ApplicationModal`.
4. Scroll/advance through the form steps until the "Образование" section is visible.

**Pass**:
- T2.a The word "Образование" has a visible red asterisk `*` next to it (rendered by Ant Design when `required={true}` on Form.Item).
- T2.b A `(?)` / info tooltip icon is present next to the label (Ant Design renders this whenever `tooltip` is set). Hover reveals the text "Добавьте минимум одно образование".

**Fail if**: label has no asterisk OR no tooltip icon. (AntD renders these automatically when props are set — absence means the patch isn't live.)

---

## T3. Knowledge portal shows concrete error per rule (#3)

**Baseline (broken)**: `handleSubmit` catches `validateFields()` rejection and shows a single generic `message.error('Не удалось создать вопрос')` regardless of which field violated which rule. User gets no actionable info.
**Expected (fixed)**: catch branch reads `validationError.errorFields[0].errors[0]` and surfaces that specific text (see <ref_snippet file="/home/ubuntu/repos/OkoZnaniy/frontend-react/src/features/knowledge/components/CreateQuestionModal.tsx" lines="147-187" />). Rules defined: title required + min 10, description required + min 20, category required.

**Steps** (as `client.one` / `testpass123`):
1. Login as `client.one`.
2. Navigate to `/knowledge`.
3. Click "Задать вопрос" (top-right primary button, opens CreateQuestionModal).
4. **T3.1 — Empty title, empty description**: leave all fields empty, click "Опубликовать".
   - Expect toast: **"Введите заголовок вопроса"** (first required rule that fails).
5. **T3.2 — Short title**: type "abc" (3 chars, <10) in Заголовок вопроса. Leave description/category empty. Click "Опубликовать".
   - Expect toast: **"Заголовок должен содержать минимум 10 символов"** (first failing rule, since required is satisfied).
6. **T3.3 — Valid title + short description**: title = "Тестовый вопрос для проверки" (≥10), description = "слишком коротко" (<20), category empty. Click "Опубликовать".
   - Expect toast: **"Описание должно содержать минимум 20 символов"**.

**Pass**:
- T3.1 toast text exactly contains "Введите заголовок вопроса" (NOT the generic "Не удалось создать вопрос").
- T3.2 toast text exactly contains "минимум 10 символов".
- T3.3 toast text exactly contains "минимум 20 символов".

**Fail if**: any of T3.1/T3.2/T3.3 shows the generic "Не удалось создать вопрос" (= old behavior) OR a totally different message.

---

## Non-goals / explicitly out of scope

- API-testable fixes already covered by shell scripts — will just reference results in the report, no duplicate UI testing:
  - #4 chat `get_or_create_by_user` guards: 6/6 PASS (`/tmp/test_today_fixes.py`)
  - #5 email/username reuse after archive: PASS (`/tmp/test_email_reuse.py`)
  - B.7 claim submit-claim dedup: PASS (400 with existing_case_number)
- #2 admin field polish — awaiting concrete field list from user, nothing to test yet.
- B.6 admin arbitration merge — noted as by-design (separate `ArbitrationSection` page), no fix shipped, nothing to test.

## Evidence

- Single continuous browser recording covering T1 → T2 → T3 in that order.
- `record_annotate` setup annotations for each test block.
- Final per-assertion pass/fail call-out in the message to user.
