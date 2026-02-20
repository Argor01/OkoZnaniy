# Аудит фронтенда (UI/код) проекта OkoZnaniy

Цель документа — пройтись по фронтенду (React) и зафиксировать проблемы UX/качества кода: дублирование компонентов и стилей, недостающие страницы/роуты, ошибки и неточности в логике, а также системные “долги”, которые мешают развивать продукт.

---

## 1. Область и критерии

Покрытие:
- Роутинг и сценарии входа/редиректов (по ролям).
- Организация UI (layout, модалки, страницы), консистентность.
- Стили: глобальные CSS, CSS-модули, инлайны, дизайн-токены.
- Слой API (axios/fetch), авторизация, обработка ошибок.
- Debug/production hygiene (console.log, временные файлы).

Критерии:
- Консистентность: единые источники правды (routes, API client, tokens).
- Минимизация дубликатов: одинаковые компоненты/модалки/стили не должны существовать в 2–3 вариантах.
- Предсказуемость: логика роли/доступа/редиректов должна быть формализована и не зависеть от localStorage “на доверии”.
- Production hygiene: без утечек env/конфигов в консоль, без мусорных логов.

---

## 2. Краткий обзор текущей архитектуры

### 2.1 Роутинг

Роутинг собран в одном месте в [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx) через `react-router-dom` (Routes/Route).

Особенности:
- Большинство “внутренних” страниц оборачиваются в `ProtectedRoute` + `DashboardLayout`.
- Есть отдельные зоны: `/admin`, `/admin/dashboard`, `/admin/directordashboard`, `/partner`, `/expert`, магазин, support-chat.

### 2.2 UI и стили

Параллельно используются:
- Ant Design (`ConfigProvider theme token`) — [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L79-L85)
- Глобальные CSS-файлы (много) — список импортов в [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L11-L29)
- CSS-модули (в отдельных страницах/компонентах)
- Инлайн-стили в JSX (повторяющиеся объекты)

Отдельно есть попытка “дизайн-токенов” в [config/ui.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/config/ui.ts), но большинство компонентов продолжает хардкодить значения напрямую.

### 2.3 API слой

Сейчас одновременно существуют:
- Основной axios-инстанс `apiClient` с refresh-логикой — [api/client.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/api/client.ts)
- Глобальный axios interceptor в utils — [utils/axiosConfig.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/utils/axiosConfig.ts)
- Отдельный fetch-клиент в админке — [AdminDashboard/utils/api.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/AdminDashboard/utils/api.ts)

---

## 3. Находки и проблемы

### 3.1 Роуты/страницы: несостыковки и “пропавшие” пути

1) **Login.tsx ожидает `/admin/login` и `/admin/directorlogin`, но таких роутов нет**
- В [Login.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/Login.tsx#L46-L49) определяется “режим логина” по `window.location.pathname === '/admin/login'` и `'/admin/directorlogin'`.
- В [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L190-L208) роут админ-логина — это `/admin` (а директор — `/admin/directordashboard`, плюс legacy redirect `/director`).

Риск/симптомы:
- “Ветвления” в Login.tsx могут никогда не сработать в реальном роутинге.
- Сложно понять, какой URL “правильный” для входа админа/директора.

Рекомендация:
- Вынести `routes` в константы и использовать их и в `App.tsx`, и в логике входа/редиректов.
- Убрать мертвые условия `/admin/login`, `/admin/directorlogin` или добавить реальные Route-алиасы на эти пути.

2) **Профили `/user/:userId` и `/expert/:userId` не защищены `ProtectedRoute`**
- См. [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L166-L181).

Риск/симптомы:
- Если `UserProfile`/`DashboardLayout` дергают приватные API или опираются на наличие токена, будет “полу-страница” с ошибками/401.
- Визуально это выглядит как “страница есть, но данные не грузятся”.

Рекомендация:
- Явно определить: профили публичные или приватные.
- Если публичные — отдельный публичный layout (без ожидания авторизации). Если приватные — завернуть в `ProtectedRoute`.

3) **`/dashboard` всегда редиректит на `/expert`**
- См. [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L134-L137).

Риск/симптомы:
- Клиенты тоже улетают в экспертский кабинет (неочевидно для UX).
- Это коррелирует с уже встречавшимися “все идут на /expert” в других местах (см. ниже).

Рекомендация:
- Делать редирект через роль, полученную с API (`/users/me/`), а не через фиксированный `Navigate`.

### 3.2 Auth/redirect: доверие к localStorage и URL, расхождение логики

1) **ProtectedRoute проверяет только наличие `access_token` в localStorage**
- [ProtectedRoute.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/components/ProtectedRoute.tsx#L8-L16)

Риск/симптомы:
- Протухший токен пропускает пользователя в UI и дальше идут каскады 401/403 на API.
- “Права” на фронте выглядят как будто есть, пока сервер не откажет.

Рекомендация:
- Считать сервер источником истины по доступу.
- На фронте: опционально “role guard” поверх `me` (и централизованный 401 handling уже есть в axios client).

2) **GoogleCallback берет `role/user_id/username` из query string**
- [GoogleCallback.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/GoogleCallback.tsx#L10-L46)

Риск/симптомы:
- Любая UI-логика, которая доверяет `localStorage.user.role`, становится подверженной подмене на клиенте.
- Редиректы становятся недетерминированными (“у меня админка открылась, но сервер потом 403”).

Рекомендация:
- После получения токенов запрашивать `me` и сохранять пользователя только из ответа сервера.

3) **Несогласованность “директора”: роль в UI выводится через email-хардкод**
- В редиректе по роли есть “эвристика директора”: [roleRedirect.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/utils/roleRedirect.ts#L14-L20)
- Похожие паттерны встречаются в админских хуках/старых файлах (см. “мусорные” файлы ниже).

Рекомендация:
- Любые “особые” роли должны приходить от API (роль/claim), без email-эвристик на фронте.

### 3.3 API слой: дублирование клиентов и разная модель авторизации

1) **Одновременно используются axios-интерцепторы в двух местах**
- Основные интерцепторы/refresh в [api/client.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/api/client.ts)
- Глобальный перехват 401 в [utils/axiosConfig.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/utils/axiosConfig.ts)

Риск/симптомы:
- Трудно предсказать порядок срабатывания и “кто именно” обработал ошибку.
- Сложнее дебажить “почему не редиректит/почему редиректит”.

Рекомендация:
- Оставить один источник (как правило, `apiClient`) и удалить/встроить вспомогательный interceptor.

2) **В админке есть отдельный fetch-клиент без Authorization**
- [AdminDashboard/utils/api.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/AdminDashboard/utils/api.ts#L14-L39)

Риск/симптомы:
- Запросы не добавляют `Authorization: Bearer ...` и не используют refresh-механику.
- Если backend не принимает cookie-сессии — админка будет “падать” на 401 или работать “иногда”.

Рекомендация:
- Перевести админский API на единый `apiClient` (axios) или добавить общую обертку с токеном/refresh.

3) **`apiClient` включает `withCredentials: true` при JWT в localStorage**
- [api/client.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/api/client.ts#L3-L9)

Риск/симптомы:
- Смешение моделей (cookie vs bearer). Если cookie не используются — параметр лишний и может запутывать.

Рекомендация:
- Явно выбрать одну модель (в текущем проекте это JWT Bearer) и убрать лишнее.

### 3.4 Production hygiene: консольные логи и утечка env/конфигурации

1) **config/api.ts печатает env и конфиг всегда**
- [config/api.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/config/api.ts#L6-L36)

Риск/симптомы:
- В production-консоли можно увидеть конфигурацию сборки и часть env.
- “Шум” в консоли мешает диагностировать реальные ошибки.

Рекомендация:
- Убрать `console.log` из module scope или обернуть в `if (import.meta.env.DEV)`.

2) **В коде много console.log / console.error**
- Пример (users section): [UsersManagementSection.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/AdminDashboard/components/Sections/UsersManagementSection.tsx#L37-L39)
- Подобных мест много (это видно по количеству вхождений).

Рекомендация:
- В DEV — оставить через флаг (`debug_api` или общий logger).
- В PROD — минимизировать.

### 3.5 Стили: дублирование, смешение подходов, несоответствие токенов

1) **Слишком много глобальных CSS, частично пересекающихся по смыслу**
- Импортятся сразу пачкой в [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L11-L29)
- В каталоге styles есть “похожие” файлы: `modals.css`, `modals-centered.css`, `modal-centering.css` — [styles](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/styles)

Риск/симптомы:
- Сложно понять “где править”.
- Стили начинают конфликтовать/переопределять друг друга.

Рекомендация:
- Зафиксировать правило: либо Antd theme + CSS modules для локальных стилей, либо глобальные классы, но с минимальным набором.

2) **Инлайн-стили массово дублируются (пример: `borderRadius: 12`)**
- В проекте много повторений `borderRadius: 12` (десятки/сотни).
- Пример рендера с большим блоком инлайнов: [ShopWorkDetail.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/ShopWorkDetail.tsx#L326-L340)

Проблема:
- Нет переиспользуемых компонент (Card wrapper / Section).
- Нельзя централизованно менять дизайн (радиусы/отступы) без массового рефакторинга.

Рекомендация:
- Использовать [config/ui.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/config/ui.ts) как единый источник и “привязать” к нему UI.
- Создать 2–3 базовых компонента (например, `SectionCard`, `GradientTitle`) и заменить повторяющиеся блоки.

3) **Несогласованность цветов/токенов**
- В Antd theme primary: `#1890ff` — [App.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/App.tsx#L79-L85)
- В UI tokens primary: `#667eea` — [config/ui.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/config/ui.ts#L46-L53)

Риск/симптомы:
- Разъезжается визуальный стиль между компонентами.

Рекомендация:
- Выбрать один “primary” и зафиксировать: либо через Antd tokens, либо через `config/ui.ts`, но не оба независимо.

### 3.6 Дублирование компонентов/модалок и мусорные файлы

1) **Дублирующиеся модалки (пример: FinanceModal)**
- Есть “компонентная” версия: [components/modals/FinanceModal.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/components/modals/FinanceModal.tsx)
- И версия в ExpertDashboard: [ExpertDashboard/modals/FinanceModal.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/ExpertDashboard/modals/FinanceModal.tsx)

Проблема:
- Логика/верстка неизбежно разойдутся. Фикс нужно делать дважды.

Рекомендация:
- Оставить одну реализацию и переиспользовать (через props/варианты).

2) **Дублирующиеся MessagesModal в разных папках**
- [components/MessagesModal.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/components/MessagesModal.tsx)
- [components/modals/MessagesModal.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/components/modals/MessagesModal.tsx)

3) **“Артефакты” в src: *.backup и *.OLD**
- [AdminDashboard.tsx.backup](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/AdminDashboard.tsx.backup)
- [ShopReadyWorks.OLD.tsx](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/pages/ShopReadyWorks.OLD.tsx)

Рекомендация:
- Удалить/вынести из `src` (или перенести в историю git). Иначе это источник регрессий (“кто-то импортнул не то”).

---

## 4. Рекомендуемый план улучшений (в порядке пользы)

1) **Роуты и редиректы**
- Вынести пути в `routes.ts` (константы).
- Привести в соответствие: `/admin` vs `/admin/login` и директорские пути.
- Для `/dashboard` сделать роль-редирект по `me`.

2) **Единый API клиент**
- Убрать fetch-клиент админки или привести его к общему `apiClient`.
- Оставить один слой интерцепторов (в одном месте).

3) **Гигиена production**
- Убрать/загейтить console.log в [config/api.ts](file:///c:/Users/omen/Desktop/Projects/OkoZnaniy/frontend-react/src/config/api.ts#L6-L36).
- Проредить console.log в компонентах/хуках (оставить только DEV-режим).

4) **Стили и дубли**
- Зафиксировать дизайн-систему: Antd tokens + минимальные глобальные стили.
- Начать вынос повторяющихся инлайнов (borderRadius/spacing/gradient-title) в базовые компоненты.
- Свести дубли модалок к одному источнику.

