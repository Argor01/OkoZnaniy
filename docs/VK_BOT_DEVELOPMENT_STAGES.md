# Этапы разработки VK-бота — OkoZnaniy

## Обзор этапов

| Этап | Название | Приоритет | Оценка | Зависимости |
|------|----------|-----------|--------|-------------|
| 1 | Подготовка инфраструктуры | Критический | 2-3 ч | — |
| 2 | Ядро VK-бота (Long Poll + команды) | Критический | 4-5 ч | Этап 1 |
| 3 | Система отправки уведомлений | Критический | 4-5 ч | Этап 1, 2 |
| 4 | Интеграция с чатом | Высокий | 3-4 ч | Этап 3 |
| 5 | Настройки пользователя и API | Средний | 2-3 ч | Этап 2 |
| 6 | Docker и деплой | Критический | 2-3 ч | Этап 1-3 |
| 7 | Тестирование и отладка | Критический | 3-4 ч | Этап 1-6 |

**Общая оценка: 20-27 часов**

---

## Этап 1: Подготовка инфраструктуры

### Цель
Подготовить модели данных, зависимости и структуру проекта для VK-бота.

### Задачи

#### 1.1. Обновление модели User
**Файл:** `apps/users/models.py`

- [ ] Добавить поле `vk_id` (`BigIntegerField`, null=True, blank=True, unique=True)
- [ ] Добавить поле `vk_notifications_enabled` (`BooleanField`, default=True)
- [ ] Создать и применить миграцию

```python
# Добавить в класс User:
vk_id = models.BigIntegerField(
    null=True, blank=True, unique=True,
    verbose_name="VK ID"
)
vk_notifications_enabled = models.BooleanField(
    default=True,
    verbose_name="VK уведомления включены"
)
```

#### 1.2. Установка зависимостей
**Файл:** `requirements.txt`

- [ ] Добавить `vk_api==11.9.9`

#### 1.3. Создание структуры модуля
- [ ] Создать директорию `vk_bot/`
- [ ] Создать `vk_bot/__init__.py`
- [ ] Создать `vk_bot/handlers/__init__.py`
- [ ] Создать `vk_bot/utils/__init__.py`

#### 1.4. Настройки Django
**Файл:** `config/settings.py`

- [ ] Добавить VK-переменные окружения:
  ```python
  VK_BOT_TOKEN = os.getenv('VK_BOT_TOKEN', '')
  VK_GROUP_ID = os.getenv('VK_GROUP_ID', '')
  VK_API_VERSION = os.getenv('VK_API_VERSION', '5.199')
  ```

### Критерии завершения
- [x] Миграция создана и применяется без ошибок
- [x] Структура директорий создана
- [x] Зависимости установлены

### Риски
- Конфликт миграций с другими ветками → решение: координация с командой

---

## Этап 2: Ядро VK-бота (Long Poll + команды)

### Цель
Создать основной процесс бота, который слушает входящие сообщения и обрабатывает команды.

### Задачи

#### 2.1. Основной файл бота
**Файл:** `vk_bot/bot.py`

- [ ] Инициализация Django
- [ ] Подключение к VK API через `vk_api.VkApi`
- [ ] Запуск `VkBotLongPoll`
- [ ] Маршрутизация событий к обработчикам
- [ ] Graceful shutdown

```python
# Структура bot.py
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType

def main():
    vk_session = vk_api.VkApi(token=VK_BOT_TOKEN)
    vk = vk_session.get_api()
    longpoll = VkBotLongPoll(vk_session, VK_GROUP_ID)
    
    for event in longpoll.listen():
        if event.type == VkBotEventType.MESSAGE_NEW:
            handle_message(event, vk)

if __name__ == "__main__":
    main()
```

#### 2.2. Обработчики команд
**Файл:** `vk_bot/handlers/commands.py`

- [ ] Обработка текста «Начать» / первое сообщение → привязка аккаунта
- [ ] Обработка «Профиль» → вывод данных пользователя
- [ ] Обработка «Баланс» → вывод баланса
- [ ] Обработка «Мои заказы» → список активных заказов
- [ ] Обработка «Помощь» → справка по командам
- [ ] Обработка неизвестных сообщений → подсказка

#### 2.3. Авторизация через deep link
**Файл:** `vk_bot/handlers/auth.py`

- [ ] Разбор payload/параметра `auth_XXXXX`
- [ ] Генерация JWT-токенов для пользователя
- [ ] Сохранение auth-данных в Redis cache
- [ ] Отправка подтверждения авторизации

#### 2.4. VK-клавиатуры
**Файл:** `vk_bot/utils/keyboards.py`

- [ ] Главное меню (Профиль, Баланс, Мои заказы, Помощь)
- [ ] Клавиатура настроек уведомлений
- [ ] Inline-кнопки со ссылками на сайт

```python
from vk_api.keyboard import VkKeyboard, VkKeyboardColor

def get_main_keyboard():
    keyboard = VkKeyboard(one_time=False)
    keyboard.add_button('Профиль', color=VkKeyboardColor.PRIMARY)
    keyboard.add_button('Баланс', color=VkKeyboardColor.PRIMARY)
    keyboard.add_line()
    keyboard.add_button('Мои заказы', color=VkKeyboardColor.SECONDARY)
    keyboard.add_button('Помощь', color=VkKeyboardColor.SECONDARY)
    keyboard.add_line()
    keyboard.add_openlink_button('Открыть сайт', WEBSITE_URL)
    return keyboard.get_keyboard()
```

### Критерии завершения
- [x] Бот запускается и подключается к VK Long Poll
- [x] Все команды обрабатываются корректно
- [x] Авторизация работает (deep link → JWT → Redis)
- [x] Клавиатуры отображаются

### Риски
- VK может блокировать бота при массовой рассылке → решение: соблюдать rate limits
- Long Poll может разрывать соединение → решение: автоматическое переподключение

---

## Этап 3: Система отправки уведомлений

### Цель
Интегрировать VK-отправку в существующую систему уведомлений через Celery.

### Задачи

#### 3.1. Утилита отправки сообщений
**Файл:** `vk_bot/sender.py`

- [ ] Функция `send_vk_message(vk_id, message, keyboard=None)`
- [ ] Обработка ошибок VK API (пользователь заблокировал бота и т.д.)
- [ ] Логирование отправок
- [ ] Rate limiting (не более 20 msg/sec)

```python
import vk_api

def send_vk_message(vk_id: int, message: str, keyboard: str = None):
    """Отправить сообщение пользователю VK."""
    vk_session = vk_api.VkApi(token=settings.VK_BOT_TOKEN)
    vk = vk_session.get_api()
    
    params = {
        'user_id': vk_id,
        'message': message,
        'random_id': 0,
    }
    if keyboard:
        params['keyboard'] = keyboard
    
    vk.messages.send(**params)
```

#### 3.2. Celery tasks
**Файл:** `vk_bot/tasks.py`

- [ ] Task `send_vk_notification(user_id, notification_type, title, message, data)`
- [ ] Retry policy (max 3 retries, exponential backoff)
- [ ] Проверка `vk_id` и `vk_notifications_enabled`

```python
from celery import shared_task

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_vk_notification(self, user_id, title, message):
    try:
        user = User.objects.get(id=user_id)
        if not user.vk_id or not user.vk_notifications_enabled:
            return
        
        text = format_notification(title, message)
        send_vk_message(user.vk_id, text)
    except Exception as exc:
        self.retry(exc=exc)
```

#### 3.3. Форматирование уведомлений
**Файл:** `vk_bot/utils/formatters.py`

- [ ] Маппинг типов уведомлений → emoji + шаблон
- [ ] Функция `format_notification(notification_type, title, message, data)`
- [ ] Генерация ссылок на объекты (заказ, чат, профиль)
- [ ] Ограничение длины сообщения (VK лимит: 4096 символов)

#### 3.4. Интеграция с NotificationService
**Файл:** `apps/notifications/services.py` (изменение)

- [ ] В метод `create_notification()` добавить вызов Celery task
- [ ] Добавить после блока WebSocket:

```python
# VK уведомление
try:
    from vk_bot.tasks import send_vk_notification
    send_vk_notification.delay(
        user_id=recipient.id,
        title=title,
        message=message,
    )
except Exception:
    pass
```

### Критерии завершения
- [x] Уведомления доставляются в VK при создании через NotificationService
- [x] Celery task корректно обрабатывает ошибки и делает retry
- [x] Пользователи без vk_id не получают ошибок
- [x] Форматирование сообщений корректное

### Риски
- VK API может быть временно недоступен → решение: retry с экспоненциальной задержкой
- Пользователь заблокировал бота → решение: graceful обработка ошибки, отключение уведомлений

---

## Этап 4: Интеграция с чатом

### Цель
Отправлять VK-уведомления при новых сообщениях в чате.

### Задачи

#### 4.1. Перехват новых сообщений чата
**Файл:** `apps/chat/services.py` или `apps/chat/signals.py` (изменение)

- [ ] При создании нового Message, если получатель не автор:
  - Проверить, есть ли vk_id у получателя
  - Отправить push-уведомление через Celery task

#### 4.2. Celery task для чат-уведомлений
**Файл:** `vk_bot/tasks.py` (дополнение)

- [ ] Task `send_vk_chat_notification(recipient_id, sender_name, chat_id, message_preview, order_id)`
- [ ] Anti-spam: проверка, что прошло >30 сек с последнего push для этого чата
- [ ] Сокращение текста сообщения до 100 символов в превью

```python
@shared_task(bind=True, max_retries=3)
def send_vk_chat_notification(self, recipient_id, sender_name, chat_id, message_preview, order_id=None):
    # Rate limit: не чаще 1 раз в 30 секунд на чат
    cache_key = f'vk_chat_push_{recipient_id}_{chat_id}'
    if cache.get(cache_key):
        return
    cache.set(cache_key, True, 30)
    
    user = User.objects.get(id=recipient_id)
    if not user.vk_id or not user.vk_notifications_enabled:
        return
    
    text = f"💬 Новое сообщение\n\nОт: {sender_name}\n"
    if order_id:
        text += f"Заказ: №{order_id}\n"
    text += f"\n\"{message_preview[:100]}...\""
    
    send_vk_message(user.vk_id, text)
```

#### 4.3. Проверка онлайн-статуса
- [ ] Не отправлять push, если пользователь подключен через WebSocket
- [ ] Использовать Redis для проверки активных соединений

### Критерии завершения
- [x] При новом сообщении в чате получатель получает VK push
- [x] Anti-spam работает (не чаще 1 раз в 30 сек)
- [x] Онлайн-пользователи не получают лишние push
- [x] Превью сообщения корректно обрезается

---

## Этап 5: Настройки пользователя и API

### Цель
Дать пользователям контроль над VK-уведомлениями.

### Задачи

#### 5.1. Команда настроек в боте
**Файл:** `vk_bot/handlers/settings.py`

- [ ] Команда «Уведомления» → показ текущего статуса
- [ ] Кнопки «Включить» / «Выключить»
- [ ] Сохранение настройки в БД

#### 5.2. API эндпоинты
**Файлы:** `apps/users/views.py`, `apps/users/urls.py`

- [ ] `POST /api/users/vk/link/` — привязка VK (из фронтенда, через OAuth)
- [ ] `DELETE /api/users/vk/unlink/` — отвязка VK
- [ ] `GET /api/users/vk/status/` — статус привязки
- [ ] `PATCH /api/users/notifications/vk/` — настройки уведомлений

#### 5.3. Фронтенд (опционально)
- [ ] Раздел в настройках профиля: «VK уведомления»
- [ ] Кнопка привязки/отвязки VK
- [ ] Переключатель уведомлений

### Критерии завершения
- [x] Пользователь может включить/выключить уведомления через бота
- [x] API эндпоинты работают корректно
- [x] Привязка/отвязка VK функционирует

---

## Этап 6: Docker и деплой

### Цель
Контейнеризация VK-бота и подготовка к деплою на продакшен.

### Задачи

#### 6.1. Dockerfile
**Файл:** `Dockerfile.vkbot`

- [ ] Базовый образ `python:3.11-slim`
- [ ] Установка зависимостей
- [ ] Копирование кода
- [ ] CMD для запуска бота

#### 6.2. Docker Compose
**Файл:** `docker-compose.yml` (изменение)

- [ ] Добавить сервис `vk-bot`
- [ ] Настроить зависимости (postgres, redis, backend)
- [ ] Передать переменные окружения

#### 6.3. Переменные окружения
**Файл:** `.env` (на сервере)

- [ ] Добавить `VK_BOT_TOKEN`
- [ ] Добавить `VK_GROUP_ID`

#### 6.4. Деплой на сервер
- [ ] SSH подключение к серверу
- [ ] `git pull` обновленного кода
- [ ] `docker-compose up -d --build vk-bot`
- [ ] Проверка логов: `docker-compose logs -f vk-bot`

### Критерии завершения
- [x] VK-бот контейнер собирается и запускается
- [x] Бот подключается к VK API из контейнера
- [x] Уведомления отправляются в продакшене

---

## Этап 7: Тестирование и отладка

### Цель
Комплексное тестирование всех компонентов VK-бота.

### Задачи

#### 7.1. Unit-тесты
- [ ] Тесты форматирования уведомлений (`formatters.py`)
- [ ] Тесты Celery tasks (mock VK API)
- [ ] Тесты обработчиков команд

#### 7.2. Интеграционные тесты
- [ ] Отправка тестового сообщения через VK API
- [ ] Привязка VK к тестовому аккаунту
- [ ] Создание уведомления → проверка доставки в VK
- [ ] Отправка сообщения в чат → проверка VK push

#### 7.3. Нагрузочное тестирование
- [ ] Проверка rate limiting (20 msg/sec)
- [ ] Проверка работы при большом количестве уведомлений
- [ ] Проверка стабильности Long Poll соединения

#### 7.4. Сценарии ошибок
- [ ] Пользователь заблокировал бота → graceful handling
- [ ] VK API недоступен → retry + logging
- [ ] Невалидный vk_id → очистка и уведомление
- [ ] Превышение rate limit → backoff

### Критерии завершения
- [x] Все unit-тесты проходят
- [x] Интеграционные тесты подтверждают работоспособность
- [x] Бот стабильно работает 24+ часов без перезапуска

---

## Диаграмма зависимостей этапов

```
Этап 1 (Инфраструктура)
    │
    ├──────────────────────┐
    ▼                      ▼
Этап 2 (Ядро бота)    Этап 6 (Docker) ←─┐
    │                      │              │
    ▼                      │              │
Этап 3 (Уведомления) ─────┤              │
    │                      │              │
    ├──────────┐           │              │
    ▼          ▼           │              │
Этап 4      Этап 5        │              │
(Чат)     (Настройки)     │              │
    │          │           │              │
    └──────┬───┘           │              │
           ▼               │              │
      Этап 7 (Тесты) ─────┘──────────────┘
```

---

## Порядок выполнения (рекомендуемый)

1. **Этап 1** — Инфраструктура (модели, зависимости, структура)
2. **Этап 2** — Ядро бота (Long Poll, команды, клавиатуры)
3. **Этап 3** — Уведомления (Celery tasks, интеграция с NotificationService)
4. **Этап 6** — Docker (параллельно с этапом 3)
5. **Этап 4** — Интеграция с чатом
6. **Этап 5** — Настройки пользователя
7. **Этап 7** — Тестирование и отладка

---

## Чеклист для запуска

- [ ] Создано VK сообщество
- [ ] Получен токен сообщества с правами на сообщения
- [ ] Включен Long Poll API в настройках сообщества
- [ ] Включена возможность писать сообщения от сообщества
- [ ] Добавлены `VK_BOT_TOKEN` и `VK_GROUP_ID` в `.env`
- [ ] Применена миграция `add_vk_id`
- [ ] Docker контейнер `vk-bot` собран и запущен
- [ ] Тестовое сообщение доставлено в VK
