# 🚀 Руководство по интеграции AdminDashboard

## 📋 Быстрый старт

### 1. Переключение на новую версию

В файле `src/App.tsx` измените импорт:

```typescript
// Старая версия (резервная копия)
import AdminDashboard from './pages/AdminDashboard.tsx';

// Новая модульная версия
import AdminDashboard from './pages/AdminDashboard';
```

### 2. Проверка зависимостей

Убедитесь, что установлены все необходимые пакеты:

```bash
npm install antd react-router-dom
```

## 🏗️ Архитектура

### Структура папок
```
AdminDashboard/
├── index.tsx                   # Главный компонент
├── AdminDashboard.module.css   # Стили главного компонента
├── README.md                   # Документация
├── INTEGRATION_GUIDE.md        # Это руководство
├── hooks/                      # Кастомные хуки
│   ├── useAdminAuth.ts        # Аутентификация
│   ├── useAdminData.ts        # Получение данных
│   ├── useAdminMutations.ts   # Мутации данных
│   ├── useAdminUI.ts          # UI состояние
│   ├── useConfirmModal.ts     # Модальные подтверждения
│   └── index.ts               # Экспорт хуков
├── components/                 # Компоненты
│   ├── Layout/                # Лейаут компоненты
│   ├── Sections/              # Секции контента
│   ├── Modals/                # Модальные окна
│   ├── Statistics/            # Статистика
│   └── Tables/                # Таблицы
├── types/                     # TypeScript типы
├── utils/                     # Утилиты
└── constants/                 # Константы
```

## 🔧 Основные компоненты

### 1. Хуки

#### useAdminAuth
```typescript
const { user, isLoading, hasToken, handleLogout } = useAdminAuth();
```

#### useAdminData
```typescript
const { stats, partners, earnings, disputes, isLoading } = useAdminData(canLoadData);
```

#### useAdminUI
```typescript
const { 
  selectedMenu, 
  handleMenuClick,
  isPartnerModalOpen,
  closePartnerModal,
  handlePartnerSave 
} = useAdminUI();
```

#### useConfirmModal
```typescript
const confirmModal = useConfirmModal();
const confirmed = await confirmModal.confirm({
  title: 'Подтвердить действие',
  content: 'Вы уверены?',
  type: 'warning'
});
```

### 2. Компоненты

#### Layout
- `AdminLayout` - Основной лейаут
- `AdminHeader` - Шапка
- `AdminSidebar` - Боковое меню
- `AdminFooter` - Подвал

#### Sections
- `OverviewSection` - Обзор
- `PartnersSection` - Партнеры
- `EarningsSection` - Доходы
- `DisputesSection` - Споры

#### Modals
- `PartnerModal` - Модальное окно партнера
- `DisputeModal` - Модальное окно спора
- `ConfirmModal` - Подтверждение действий

## 🎨 Стилизация

### CSS Модули
Каждый компонент имеет свой CSS модуль:
```typescript
import styles from './Component.module.css';
```

### Адаптивность
Все компоненты адаптивны и поддерживают:
- Мобильные устройства (< 768px)
- Планшеты (768px - 1024px)
- Десктоп (> 1024px)

## 🔌 API Интеграция

### Утилиты API
```typescript
import { statsApi, usersApi, partnersApi, disputesApi } from './utils/api';

// Получение статистики
const stats = await statsApi.getStats();

// Работа с пользователями
const users = await usersApi.getUsers({ page: 1, limit: 10 });

// Обновление партнера
const partner = await partnersApi.updatePartner(id, data);
```

### Форматтеры
```typescript
import { formatDate, formatCurrency, formatPercent } from './utils/formatters';

const formattedDate = formatDate(new Date());
const formattedPrice = formatCurrency(1000);
const formattedPercent = formatPercent(15.5);
```

### Валидаторы
```typescript
import { validateEmail, validatePhone, validateUserForm } from './utils/validators';

const isValidEmail = validateEmail('user@example.com');
const { isValid, errors } = validateUserForm(userData);
```

## 🧪 Тестирование

### Unit тесты
```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage
```

### E2E тесты
```bash
# Cypress тесты
npm run test:e2e
```

## 🚀 Развертывание

### Сборка
```bash
npm run build
```

### Проверка типов
```bash
npm run type-check
```

### Линтинг
```bash
npm run lint
```

## 🔄 Миграция со старой версии

### 1. Резервное копирование
Старый файл `AdminDashboard.tsx` остается как резервная копия.

### 2. Постепенная миграция
Можете переключаться между версиями изменяя импорт в `App.tsx`.

### 3. Совместимость
Новая версия полностью совместима со старым API.

## 🐛 Отладка

### Логирование
```typescript
// Включить детальное логирование
localStorage.setItem('admin-debug', 'true');
```

### Состояние
```typescript
// Проверить состояние в DevTools
window.__ADMIN_STATE__
```

## 📞 Поддержка

### Частые проблемы

1. **Модальные окна не открываются**
   - Проверьте состояние `isPartnerModalOpen`
   - Убедитесь, что `selectedPartner` не null

2. **Данные не загружаются**
   - Проверьте `canLoadData` в `useAdminAuth`
   - Убедитесь в правильности API endpoints

3. **Стили не применяются**
   - Проверьте импорт CSS модулей
   - Убедитесь в правильности классов

### Контакты
- GitHub Issues: [ссылка на репозиторий]
- Документация: [ссылка на документацию]
- Slack: #admin-dashboard

## 🎯 Roadmap

### Ближайшие обновления
- [ ] Добавление тестов
- [ ] Улучшение производительности
- [ ] Новые секции
- [ ] Расширенная аналитика

### Долгосрочные планы
- [ ] PWA поддержка
- [ ] Темная тема
- [ ] Интернационализация
- [ ] Расширенные права доступа