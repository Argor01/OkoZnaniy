# ShopReadyWorks - Магазин готовых работ

## Структура

```
ShopReadyWorks/
├── index.tsx                    # Главный компонент с Sidebar
├── types.ts                     # TypeScript типы
├── mockData.ts                  # Тестовые данные
├── ShopReadyWorks.module.css   # Стили
├── components/
│   ├── WorkCard/               # Карточка работы
│   ├── Filters/                # Фильтры и поиск
│   ├── WorksList/              # Список работ
│   └── WorkDetails/            # Детали работы (TODO)
└── modals/                     # Модальные окна (TODO)
```

## Компоненты

### WorkCard
Карточка одной работы с превью, ценой, рейтингом и кнопками действий.

**Props:**
- `work: Work` - данные работы
- `onView: (id: number) => void` - клик по карточке
- `onFavorite: (id: number) => void` - добавить в избранное
- `onPurchase: (id: number) => void` - купить работу

### Filters
Панель фильтров с поиском, категориями и сортировкой.

**Props:**
- `filters: FiltersType` - текущие фильтры
- `onFilterChange: (filters: FiltersType) => void` - изменение фильтров

### WorksList
Grid список работ с адаптивной версткой.

**Props:**
- `works: Work[]` - массив работ
- `loading?: boolean` - состояние загрузки
- `onWorkClick: (id: number) => void` - клик по работе
- `onFavorite: (id: number) => void` - избранное
- `onPurchase: (id: number) => void` - покупка

## Использование

```tsx
import ShopReadyWorks from './pages/ShopReadyWorks';

// В роутере
<Route path="/shop/ready-works" element={<ShopReadyWorks />} />
```

## TODO

- [ ] Создать компонент WorkDetails для детального просмотра
- [ ] Добавить модальное окно покупки
- [ ] Подключить реальное API вместо mockData
- [ ] Добавить пагинацию
- [ ] Добавить фильтр по цене (диапазон)
- [ ] Добавить сохранение фильтров в URL

## Миграция

Старый файл переименован в `ShopReadyWorks.OLD.tsx` и может быть удален после тестирования.
