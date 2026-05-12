# OkoZnaniy Frontend — Поэтапный план рефакторинга

**Проект:** 136 602 строки кода | 227 TSX + 142 TS + 260 CSS файлов | 19 feature-модулей
**Стек:** React 18 + TypeScript + Vite + Ant Design + React Query + CSS Modules

---

## Этап 1. Стабилизация и защита от падений
**Приоритет:** Критичный | **Оценка:** 1–2 дня | **Риск:** Низкий

Цель: предотвратить белые экраны и утечки debug-информации в продакшен.

### 1.1. Добавить Error Boundaries во все дашборды

`ErrorBoundary` компонент уже существует (`features/common/components/ErrorBoundary.tsx`), но используется только в 2 местах. Нужно обернуть каждую секцию каждого дашборда.

**Файлы для изменения:**
| Файл | Что обернуть |
|------|-------------|
| `features/director/pages/DirectorDashboard.tsx` | Каждый `component` в массиве `menuItems` |
| `features/partner/pages/PartnerDashboard.tsx` | Каждый `component` в массиве `menuItems` |
| `features/arbitrator/pages/ArbitratorDashboard.tsx` | Секции `NavigationPanel`, `ClaimsProcessing`, `InternalCommunication` |
| `features/admin/pages/AdminDashboard.tsx` | Уже использует lazy() — добавить ErrorBoundary в Suspense fallback |
| `features/admin/pages/NewAdminDashboard.tsx` | Секции контента |
| `features/expert/pages/ExpertDashboard/` | Табы профиля |
| `routes/AppRoutes.tsx` | Обернуть корневой `<Suspense>` в `<ErrorBoundary>` |

**Пример:**
```tsx
// Было:
{ key: 'personnel', component: <PersonnelManagement /> }

// Стало:
{ key: 'personnel', component: <ErrorBoundary><PersonnelManagement /></ErrorBoundary> }
```

### 1.2. Очистить console.log из продакшен-кода

**218+ незащищённых console.log/warn/error** в **65 файлах**.

Самые загрязнённые файлы:
| Файл | Количество |
|------|-----------|
| `features/director/api/directorApi.ts` | 39 |
| `features/expert/modals/MessageModalNew.tsx` | 15 |
| `features/admin/hooks/useAdminUI.ts` | 15 |
| `features/orders/pages/OrdersFeed/index.tsx` | 10 |
| `features/admin/hooks/useRequestProcessing.ts` | 8 |
| `features/partner/api/partnerChats.ts` | 8 |
| + ещё 59 файлов | |

**Действие:** Создать утилиту `logger.ts`:
```ts
export const logger = {
  log: (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); },
  warn: (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); },
  error: (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); },
};
```
Заменить все `console.log/warn/error` → `logger.log/warn/error` через глобальный find-replace.

### 1.3. Включить TypeScript strict mode

Текущий `tsconfig.json`: `"strict": false, "noUnusedLocals": false`.

**Действие (поэтапно):**
1. Включить `"noImplicitAny": true` → исправить ошибки
2. Включить `"strictNullChecks": true` → исправить ошибки
3. Включить `"strict": true` → финальная проверка

**Файлы с `any` типом (15+):**
- `features/expert/modals/MessageModalNew.tsx` — 7 случаев
- `features/expert/pages/ExpertApplication.tsx` — 4
- `features/admin/utils/helpers.ts` — 4
- `features/expert/modals/ApplicationModal.tsx` — 3
- `features/admin/pages/AdminLogin.tsx` — 3
- + ещё 10 файлов

---

## Этап 2. Декомпозиция гигантских компонентов
**Приоритет:** Высокий | **Оценка:** 3–5 дней | **Риск:** Средний

Цель: разбить файлы >500 строк на поддерживаемые модули по 100–300 строк.

### 2.1. MessageModalNew.tsx (3 903 строки) — САМЫЙ СРОЧНЫЙ

Самый большой файл проекта. Содержит: модальное окно чата, отправку сообщений, emoji picker, файловые вложения, статусы, кнопки действий.

**Предлагаемая декомпозиция:**
```
features/expert/modals/MessageModalNew/
├── index.tsx                    # Главный компонент (оркестратор, ~200 строк)
├── ChatHeader.tsx               # Шапка чата с информацией о заказе
├── MessageList.tsx              # Список сообщений с виртуализацией
├── MessageBubble.tsx            # Отдельное сообщение
├── MessageInput.tsx             # Поле ввода + emoji picker + вложения
├── FileAttachment.tsx           # Компонент вложений файлов
├── ChatActions.tsx              # Кнопки действий (арбитраж, завершение)
├── hooks/
│   ├── useMessageModal.ts       # Основная логика состояний
│   ├── useChatMessages.ts       # Загрузка и отправка сообщений
│   └── useFileUpload.ts         # Логика загрузки файлов
├── utils/
│   ├── emojiHelpers.ts          # detectDeviceEmojiFamily, isEmojiRenderable
│   ├── fileHelpers.ts           # truncateFileName, getFileIconByName
│   └── messageHelpers.ts        # normalizeMessageText, hasVisibleMessageContent
├── types.ts                     # Интерфейсы
├── MessageModalNew.module.css   # Существующие стили
└── Responsive.module.css        # Существующие стили
```

### 2.2. OrderDetail.tsx (1 299 строк)

**Предлагаемая декомпозиция:**
```
features/orders/pages/OrderDetail/
├── index.tsx              # Оркестратор (~150 строк)
├── OrderHeader.tsx        # Заголовок, статус, мета-информация
├── OrderContent.tsx       # Описание, файлы, предмет, тип работы
├── OrderBids.tsx          # Список откликов экспертов
├── OrderActions.tsx       # Кнопки действий (принять, отклонить, редактировать)
├── OrderTimeline.tsx      # История изменений
└── hooks/
    └── useOrderDetail.ts  # Логика загрузки и мутаций
```

### 2.3. Admin Sections (29 файлов, 16 009 строк суммарно)

15 секций > 500 строк. Общий паттерн: таблица + фильтры + модалки + API-вызовы.

**Рекомендация:** Создать базовый шаблон `AdminSection`:
```tsx
interface AdminSectionProps<T> {
  title: string;
  queryKey: string[];
  queryFn: () => Promise<T[]>;
  columns: ColumnsType<T>;
  filters?: FilterConfig[];
  actions?: ActionConfig[];
}
```

Самые большие секции для рефакторинга:
| Файл | Строки |
|------|--------|
| `ClaimsProcessingSection.tsx` | 1 038 |
| `DirectorCommunicationSection.tsx` | 975 |
| `InProgressRequestsSection.tsx` | 958 |
| `OpenRequestsSection.tsx` | 920 |
| `CategoriesSubjectsSection.tsx` | 779 |
| `CompletedRequestsSection.tsx` | 737 |
| `PendingApprovalSection.tsx` | 723 |
| `KnowledgeBaseSection.tsx` | 712 |
| + ещё 7 секций > 500 строк | |

### 2.4. Login.tsx (819 строк)

Содержит и форму входа, и форму регистрации, и социальные кнопки.

**Предлагаемая декомпозиция:**
```
features/auth/pages/Login/
├── index.tsx              # Переключатель форм
├── LoginForm.tsx          # Форма входа
├── RegisterForm.tsx       # Форма регистрации
├── SocialLoginButtons.tsx # Кнопки OAuth (Telegram, VK, Google)
└── hooks/
    └── useAuth.ts         # Логика аутентификации
```

---

## Этап 3. Устранение дублирования кода
**Приоритет:** Высокий | **Оценка:** 2–3 дня | **Риск:** Средний

### 3.1. Унифицировать чат-компоненты

4 почти идентичных реализации чата:

| Компонент | Строки | Роль |
|-----------|--------|------|
| `DirectorChatsSection.tsx` | 564 | Чат директора |
| `PartnerChatsSection.tsx` | 593 | Чат партнёра |
| `SupportChatsSection.tsx` | 540 | Чат поддержки |
| `AdminChatsSection.tsx` | 285 | Чат администратора |
| **Итого** | **1 982** | |

Все используют одинаковые imports (`Card, List, Button, Tag, Space, Typography, Input, Modal, message, Tooltip, Badge, Form, Upload, Select`), одинаковую структуру (список чатов + окно сообщений + форма отправки).

**Решение:** Создать общий компонент:
```
components/chat/
├── ChatSection.tsx           # Общий компонент (~300 строк)
├── ChatRoomList.tsx          # Список чат-комнат
├── ChatMessages.tsx          # Окно сообщений
├── ChatMessageInput.tsx      # Поле ввода с файлами
├── hooks/
│   └── useChatSection.ts     # Общая логика (загрузка, отправка, WS)
└── types.ts                  # ChatRoom, ChatMessage, ChatConfig
```

```tsx
// Использование:
<ChatSection
  role="director"
  apiEndpoint="/chat/director"
  title="Внутренняя коммуникация"
  allowFileUpload={true}
/>
```

**Экономия:** ~1 400 строк (с 1 982 до ~600).

### 3.2. Объединить features/arbitration и features/arbitrator

| Папка | Содержимое |
|-------|-----------|
| `features/arbitration/` | api/complaints.ts, components/, pages/ |
| `features/arbitrator/` | api/arbitratorApi.ts, api/disputes.ts, api/types.ts, components/, pages/, types/ |

**Действие:** Объединить в `features/arbitration/`:
```
features/arbitration/
├── api/
│   ├── complaints.ts
│   ├── arbitratorApi.ts
│   ├── disputes.ts
│   └── types.ts
├── components/
│   ├── ClaimsProcessing/
│   ├── InternalCommunication/
│   └── NavigationPanel/
├── pages/
│   ├── ComplaintDetails.tsx
│   └── ArbitratorDashboard.tsx
├── types/
└── index.ts
```

---

## Этап 4. Унификация стилей
**Приоритет:** Средний | **Оценка:** 3–4 дня | **Риск:** Средний

### 4.1. Перенести глобальные стили в CSS Modules

Текущее состояние: **198 CSS Module** файлов + **62 глобальных CSS** файла (12 250 строк).

Глобальные стили создают неявные зависимости и конфликты имён.

**Порядок миграции (по размеру):**
| Файл | Строки | Целевой компонент |
|------|--------|-------------------|
| `styles/landing.css` | 3 102 | `features/landing/` → CSS Modules |
| `styles/admin-dashboard.css` | 2 357 | `features/admin/` → CSS Modules |
| `styles/director.css` | 1 013 | `features/director/` → CSS Modules |
| `styles/login.css` | 962 | `features/auth/` → CSS Modules |
| `styles/modals.css` | 659 | Распределить по компонентам |
| `styles/globals.css` | 652 | Оставить только CSS-переменные и ресеты |
| + ещё 8 файлов | 3 505 | По соответствующим features/ |

**Правило:** После миграции в `styles/` должны остаться только:
- `globals.css` — CSS-переменные, ресеты, шрифты
- `tokens.css` — дизайн-токены
- `page-transitions.css` — анимации переходов

### 4.2. Стандартизировать именование CSS классов

Сейчас смешаны подходы:
- camelCase в CSS Modules: `.filterCard`, `.budgetRow` — правильно
- kebab-case в глобальных: `.admin-dashboard-section` — нужно мигрировать
- BEM-подобные: `.partnerDashboardCardSpacing` — длинные имена

**Стандарт:** camelCase для CSS Modules (Vite convention).

---

## Этап 5. Архитектурные улучшения
**Приоритет:** Средний | **Оценка:** 2–3 дня | **Риск:** Низкий

### 5.1. Разделить AppRoutes.tsx по feature-модулям

Текущий: 369 строк, один файл со всеми маршрутами.

**Решение:**
```
routes/
├── AppRoutes.tsx          # Импорт и сборка (~50 строк)
├── adminRoutes.tsx        # /admin/*
├── directorRoutes.tsx     # /admin/directordashboard/*
├── expertRoutes.tsx       # /expert/*
├── orderRoutes.tsx        # /orders/*, /orders-feed, /my-works
├── partnerRoutes.tsx      # /partner/*
├── supportRoutes.tsx      # /support/*
├── knowledgeRoutes.tsx    # /knowledge/*, /knowledge-base/*
├── shopRoutes.tsx         # /shop/*
└── authRoutes.tsx         # /login, /register, /ref/*
```

### 5.2. Централизовать API-клиент

Текущее состояние: 14 отдельных API-файлов в разных features, каждый импортирует `apiClient` напрямую.

**Улучшение:** Добавить интерцепторы для:
- Автоматический retry при 401 (обновление токена)
- Централизованная обработка ошибок
- Логирование запросов в dev-режиме

### 5.3. Создать общие React Query хуки

Сейчас много повторяющегося кода:
```tsx
// Повторяется во многих компонентах:
const { data: userProfile } = useQuery({
  queryKey: ['user-profile'],
  queryFn: () => authApi.getCurrentUser(),
});
```

**Решение:** Вынести в `hooks/queries/`:
```ts
// hooks/queries/useCurrentUser.ts
export const useCurrentUser = () => useQuery({
  queryKey: ['user-profile'],
  queryFn: () => authApi.getCurrentUser(),
});
```

---

## Этап 6. Оптимизация производительности
**Приоритет:** Низкий | **Оценка:** 1–2 дня | **Риск:** Низкий

### 6.1. Оптимизировать бандл

Текущие крупные чанки:
| Чанк | Размер | Gzip |
|------|--------|------|
| `ui-*.js` | 1 341 KB | 416 KB |
| `pdf-*.js` | 1 013 KB | 363 KB |
| `vfs_fonts-*.js` | 855 KB | 466 KB |
| `xlsx-*.js` | 429 KB | 143 KB |
| `charts-*.js` | 349 KB | 103 KB |

**Действия:**
- Динамический импорт для PDF и XLSX (используются только при экспорте)
- Tree-shaking для Ant Design иконок (импортировать конкретные, а не весь пакет)

### 6.2. Добавить виртуализацию списков

Длинные списки (заказы, сообщения, пользователи) рендерятся целиком. При большом количестве данных это замедляет UI.

**Решение:** Использовать `react-window` или `@tanstack/react-virtual` для:
- Ленты заказов (OrdersFeed)
- Списков сообщений в чатах
- Таблиц пользователей в админке

---

## Этап 7. Тестирование
**Приоритет:** Низкий (но стратегически важный) | **Оценка:** 5–7 дней | **Риск:** Низкий

Тестов в проекте нет.

### 7.1. Настроить инфраструктуру
- Vitest + React Testing Library
- Настроить CI pipeline для запуска тестов

### 7.2. Написать тесты для критичных потоков
1. Авторизация (login, logout, token refresh)
2. Создание заказа
3. Отклик на заказ
4. Ролевая маршрутизация (redirectByRole)

---

## Сводная таблица

| Этап | Название | Дни | Риск | Экономия строк |
|------|----------|-----|------|----------------|
| 1 | Стабилизация | 1–2 | Низкий | — |
| 2 | Декомпозиция компонентов | 3–5 | Средний | ~5 000 |
| 3 | Устранение дублирования | 2–3 | Средний | ~1 500 |
| 4 | Унификация стилей | 3–4 | Средний | ~3 000 |
| 5 | Архитектурные улучшения | 2–3 | Низкий | — |
| 6 | Оптимизация производительности | 1–2 | Низкий | — |
| 7 | Тестирование | 5–7 | Низкий | — |
| **Итого** | | **17–26 дней** | | **~9 500 строк** |

---

## Правила рефакторинга

1. **Один этап = один PR.** Не смешивать этапы в одном PR.
2. **Не менять поведение.** Рефакторинг не должен менять функциональность.
3. **Проверять после каждого шага.** `npm run build` + проверка в браузере.
4. **Начинать с малого.** Внутри этапа сначала делать простые файлы, потом сложные.
5. **Документировать.** Каждый PR описывает что изменилось и почему.
