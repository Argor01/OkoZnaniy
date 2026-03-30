# Инструкция по установке системы арбитража

## Что было сделано

### Backend (Django)

1. **Создано новое приложение `apps/arbitration`** с моделями:
   - `ArbitrationCase` - арбитражные дела
   - `ArbitrationMessage` - сообщения в делах
   - `ArbitrationActivity` - лента активности

2. **Созданы API endpoints** для:
   - Подачи претензий (пошаговая форма)
   - Управления делами (админы)
   - Отправки сообщений
   - Принятия решений и оформления возвратов

3. **Добавлены в конфигурацию**:
   - `config/settings.py` - добавлено `apps.arbitration` в `INSTALLED_APPS`
   - `config/urls.py` - добавлен маршрут `/api/arbitration/`

### Frontend (React + TypeScript)

1. **Компонент для клиентов**:
   - `ArbitrationSubmissionForm.tsx` - пошаговая форма подачи претензии
   - 3 шага: основная информация, причина и описание, финансовые требования
   - Валидация обязательных полей

2. **Компоненты для админов**:
   - `ArbitrationSection.tsx` - список дел с фильтрами и статистикой
   - `ArbitrationCaseDetailPage.tsx` - детальная страница дела
   - Исправлены баги с полем ввода и кнопками

3. **Профессиональный дизайн**:
   - Современный UI как в крупных проектах
   - Структурированное отображение информации
   - Четкое разделение истца и ответчика

## Шаги для запуска

### 1. Применить миграции

```bash
# Активируйте виртуальное окружение
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Создайте и примените миграции
python manage.py makemigrations arbitration
python manage.py migrate arbitration
```

### 2. Проверить настройки

Убедитесь, что в `config/settings.py` есть:
```python
INSTALLED_APPS = [
    # ...
    'apps.arbitration',
]
```

Убедитесь, что в `config/urls.py` есть:
```python
urlpatterns = [
    # ...
    path('api/arbitration/', include('apps.arbitration.urls')),
]
```

### 3. Перезапустить сервер

```bash
python manage.py runserver
```

### 4. Установить фронтенд зависимости (если нужно)

```bash
cd frontend-react
npm install
npm run dev
```

## Проверка работоспособности

### Backend

1. Откройте в браузере: `http://localhost:8000/api/arbitration/cases/`
2. Должен вернуться список дел (пустой, если дел нет)

### Frontend

1. Для клиентов: форма подачи претензии
2. Для админов: `/admin/dashboard` - должна появиться секция "Арбитраж"
3. Детальная страница: `/admin/arbitration/ARB-XXXXXXXX`

## Основные изменения

### Исправленные баги

1. **Поле ввода текста** - теперь работает корректно, не печатает по одной букве
2. **Кнопки быстрых действий** - корректно меняют статус
3. **Отправка сообщений** - без ошибок

### Новые возможности

1. **Пошаговая форма** - клиент не может подать претензию без описания
2. **Структурированный просмотр** - параметры в столбец, не "кашей"
3. **История переписки** - все сообщения между сторонами в одном окне
4. **Возврат средств** - с указанием процента
5. **Профессиональный UI** - современный дизайн

## Интеграция с существующей админ-панелью

### Добавить в меню админ-панели

В файле `frontend-react/src/features/admin/constants/menuItems.ts` добавьте:

```typescript
{
  key: 'arbitration',
  icon: <ScaleOutlined />,
  label: 'Арбитраж',
  path: '/admin/arbitration'
}
```

### Добавить маршрут

В файле `frontend-react/src/routes/AdminRoutes.tsx` добавьте:

```typescript
import { ArbitrationSection } from '@/features/admin/components/Sections/ArbitrationSection';
import { ArbitrationCaseDetailPage } from '@/features/admin/pages/ArbitrationCaseDetailPage';

// В роутах:
<Route path="/admin/arbitration" element={<ArbitrationSection />} />
<Route path="/admin/arbitration/:caseNumber" element={<ArbitrationCaseDetailPage />} />
```

## Тестирование

### Создать тестовое дело

```bash
python manage.py shell
```

```python
from apps.arbitration.models import ArbitrationCase
from apps.users.models import User

plaintiff = User.objects.first()
case = ArbitrationCase.objects.create(
    plaintiff=plaintiff,
    subject="Тестовое дело",
    description="Описание тестового дела для проверки работы системы",
    reason="order_not_completed",
    refund_type="partial",
    requested_refund_percentage=50
)
case.submit()
print(f"Создано дело: {case.case_number}")
```

### Проверить API

```bash
# Получить список дел
curl http://localhost:8000/api/arbitration/cases/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить статистику
curl http://localhost:8000/api/arbitration/stats/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Возможные проблемы и решения

### Ошибка миграции

Если возникает ошибка при миграции:
```bash
python manage.py migrate arbitration --fake-initial
```

### Ошибка импорта

Если не находится модуль:
```bash
pip install -r requirements.txt
```

### Ошибка на фронтенде

Если компоненты не отображаются:
```bash
cd frontend-react
npm install
npm run build
```

## Дополнительная настройка

### Права доступа

Убедитесь, что у пользователей с ролью `admin` есть доступ к арбитражу.

### Уведомления

Настройте уведомления для:
- Новых дел
- Сообщений от администратора
- Принятых решений

### Интеграция с платежами

Для автоматических возвратов интегрируйте с вашей платежной системой.

## Поддержка

Для вопросов и предложений:
- Документация: `apps/arbitration/README.md`
- API документация: `/api/arbitration/` (Swagger/OpenAPI)

## Следующие шаги

1. Протестировать все функции
2. Настроить уведомления
3. Обучить администраторов
4. Запустить в продакшн
5. Собрать обратную связь от пользователей
