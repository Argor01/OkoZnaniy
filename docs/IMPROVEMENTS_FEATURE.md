# Функция "Рекомендации по улучшению"

## Описание
Страница "Рекомендации по улучшению" позволяет клиентам и экспертам отправлять свои предложения по улучшению сервиса директору.

## Расположение
- **URL**: `/improvements`
- **Пункт меню**: Сайдбар → "Рекомендации по улучшению" (иконка лампочки)

## Структура файлов

### Frontend
```
frontend-react/src/features/improvements/
├── api/
│   └── improvements.ts          # API для работы с рекомендациями
├── pages/
│   ├── ImprovementsSurveyPage.tsx       # Основная страница
│   └── ImprovementsSurveyPage.module.css # Стили
└── index.ts                     # Экспорты
```

### Backend
```
apps/users/
├── models.py                    # Модель ImprovementSuggestion
└── migrations/
    └── 0014_improvementsuggestion.py
```

## API Endpoints

### Отправка рекомендации
- **POST** `/users/submit_improvement_suggestion/`
- **Payload**:
  ```json
  {
    "area": "ui_ux" | "functionality" | "performance" | "content" | "support" | "other",
    "comment": "Текст рекомендации (минимум 10 символов)"
  }
  ```

### Получение списка рекомендаций (для директора)
- **GET** `/users/improvement_suggestions/`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "user_id": 123,
      "username": "user@example.com",
      "role": "client",
      "avatar": null,
      "email": "user@example.com",
      "area": "ui_ux",
      "area_display": "Интерфейс и удобство",
      "comment": "Предложение по улучшению...",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
  ```

## Области улучшения
- **ui_ux** - Интерфейс и удобство
- **functionality** - Функциональность
- **performance** - Производительность
- **content** - Контент
- **support** - Поддержка
- **other** - Другое

## Интеграция

### Добавление в сайдбар
Пункт меню добавлен в `Sidebar.tsx`:
- Иконка: `BulbOutlined` (лампочка)
- Обработчик: `onImprovementsClick` → переход на `/improvements`

### Роутинг
Маршрут настроен в `AppRoutes.tsx`:
```tsx
<Route
  path={ROUTES.improvements.survey}
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <ImprovementsSurveyPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>
```

## Доступ
- Доступно для всех авторизованных пользователей (клиенты и эксперты)
- Требуется авторизация через `ProtectedRoute`

## Особенности
1. Минимальная длина комментария: 10 символов
2. Максимальная длина комментария: 1200 символов
3. Счётчик символов в поле ввода
4. Валидация формы перед отправкой
5. Уведомление об успешной отправке
6. Автоматическая очистка формы после отправки
