# PurchasedWorks - Купленные работы

## Описание
Страница для просмотра и управления купленными работами из авторского магазина.

## Структура

```
PurchasedWorks/
├── index.tsx                       # Главный компонент страницы
├── types.ts                        # TypeScript типы
├── mockData.ts                     # Моковые данные
├── PurchasedWorks.module.css      # Стили страницы
├── components/
│   ├── PurchasedWorkCard/         # Карточка купленной работы
│   │   ├── index.tsx
│   │   └── PurchasedWorkCard.module.css
│   ├── WorksList/                 # Список работ
│   │   ├── index.tsx
│   │   └── WorksList.module.css
│   ├── Filters/                   # Фильтры и поиск
│   │   ├── index.tsx
│   │   └── Filters.module.css
│   └── EmptyState/                # Пустое состояние
│       ├── index.tsx
│       └── EmptyState.module.css
└── README.md
```

## Компоненты

### PurchasedWorks (главный)
- Использует Sidebar из `components/layout/Sidebar`
- Управляет фильтрацией и сортировкой
- Обрабатывает скачивание работ
- Условный рендеринг (EmptyState или список)

### PurchasedWorkCard
- Карточка с информацией о купленной работе
- Статус скачивания (бейдж)
- Тип работы и предмет
- Дата покупки
- Цена (с зачеркнутой старой ценой при скидке)
- Кнопка "Скачать"
- Счетчик скачиваний

### WorksList
- Адаптивная сетка карточек (xs=24, sm=12, md=8, lg=6)
- Состояние загрузки (Spin)
- Пустое состояние (Empty)
- Центрирование карточек

### Filters
- Поиск по названию
- Фильтр по типу работы
- Фильтр по предмету
- Фильтр по статусу (все/скачанные/не скачанные)
- Сортировка (по дате, по цене)

### EmptyState
- Анимированная иконка магазина
- Текст "У вас пока нет купленных работ"
- Кнопка "Перейти в магазин"

## Типы данных

### PurchasedWork
```typescript
interface PurchasedWork {
  id: number;
  title: string;
  type: string;
  subject: string;
  price: number;
  originalPrice?: number;
  purchaseDate: string;
  downloadUrl: string;
  isDownloaded: boolean;
  downloadCount: number;
  preview?: string;
  description: string;
  rating?: number;
  reviewsCount?: number;
}
```

### FiltersState
```typescript
interface FiltersState {
  search?: string;
  type?: string;
  subject?: string;
  sortBy: 'date' | 'price-asc' | 'price-desc';
  status?: 'all' | 'downloaded' | 'not-downloaded';
}
```

## Функциональность

### Фильтрация
- По названию (поиск)
- По типу работы
- По предмету
- По статусу скачивания

### Сортировка
- По дате покупки (по умолчанию)
- По цене (возрастание)
- По цене (убывание)

### Действия
- Скачать работу
- Просмотр деталей (в разработке)
- Повторное скачивание

## Стиль

### Цветовая схема
- Синий: #3b82f6 (primary)
- Градиентный фон страницы
- Современные тени и скругления

### Карточки
- border-radius: 16px
- Hover эффект с подъемом
- Градиентный фон
- Статус бейджи

### Кнопки
- Скачать: синий градиент
- border-radius: 10px
- Hover с подъемом и увеличением тени

### Анимации
- fadeInUp для контента
- pulse для иконки EmptyState
- Плавные transitions

## Рефакторинг

### Было:
- 1 файл PurchasedWorks.tsx (1599 строк)
- Встроенное меню
- Дублирование модальных окон
- Монолитная структура

### Стало:
- Модульная структура (~350 строк)
- Общий Sidebar с модальными окнами
- Переиспользуемые компоненты
- Чистый и поддерживаемый код

**Сокращение кода: ~78%**

## Интеграция с API

В текущей версии используются моковые данные из `mockData.ts`. 
Для интеграции с реальным API:

1. Заменить `mockPurchasedWorks` на API запрос
2. Добавить состояние загрузки
3. Обработать ошибки
4. Реализовать функцию скачивания

Пример:
```typescript
const { data: works, isLoading } = useQuery({
  queryKey: ['purchased-works'],
  queryFn: () => api.getPurchasedWorks(),
});
```

## Единообразие с магазином

Страница полностью соответствует дизайн-системе других страниц магазина:
- ✅ Единый Sidebar (components/layout/Sidebar)
- ✅ Единая цветовая схема (#3b82f6)
- ✅ Единая структура Layout
- ✅ Единые анимации и эффекты
- ✅ Адаптивный дизайн

## Связанные страницы
- ShopReadyWorks - магазин готовых работ
- AddWorkToShop - добавление работы в магазин
- MyWorks - мои работы (для экспертов)
