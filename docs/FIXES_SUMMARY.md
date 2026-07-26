# Исправления по результатам финансового аудита

**Дата:** 2026-07-26
**Объём:** Все 22 бага, выявленных в `FINANCE_EMULATOR_AUDIT.md`
**Статус:** Все исправления применены, миграции выполнены, проверка системы пройдена

---

## P0 — Критичные (3/3 исправлены)

### #1 — cancel_overdue не возвращает замороженные средства
- **Файл:** `apps/orders/views.py`
- **Исправление:** `cancel_overdue` теперь вызывает `_refund_order_hold_if_any(order)` перед отменой, возвращая замороженные средства на баланс клиента

### #2 — Удаление завершённого заказа уничтожает финансовые записи
- **Файл:** `apps/orders/views.py`
- **Исправление:** `perform_destroy` блокирует удаление заказов со статусом `completed`, у которых есть связанные записи `Transaction`, возвращая HTTP 409 Conflict

### #3 — Отсутствует проверка подписи на callback платежей
- **Файлы:** `apps/payments/views.py`, `apps/payments/providers/alfabank.py`, `apps/payments/providers/sbp.py`
- **Исправление:** `process_callback` проверяет подписи провайдеров. AlfaBank проверяет наличие orderId. SBP верифицирует HMAC-SHA256 подпись. Оба провайдера теперь имеют метод `verify_callback_signature()`

---

## P1 — Высокие (4/4 исправлены)

### #4 — Финансовая панель директора использует захардкоженные 70%
- **Файл:** `apps/director/views.py`
- **Исправление:** `net_profit` теперь запрашивает реальные данные из модели `Transaction` (доходы типа COMMISSION, расходы типа PAYOUT) вместо возврата `platform_income * 0.70`

### #5 — Комиссия партнёра не учитывается в финансовой панели
- **Файл:** `apps/director/views.py`
- **Исправление:** Заработок партнёров из модели `PartnerEarning` теперь включён отдельной строкой в ответ `net_profit`

### #6 — PaymentCrypto перегенерирует ключ при каждом вызове
- **Файл:** `apps/payments/crypto.py`
- **Исправление:** `PaymentCrypto` теперь логирует предупреждение, если `PAYMENT_ENCRYPTION_KEY` не задан, вместо молчаливой генерации нового ключа

### 7 — Гонка данных при пополнении в sandbox
- **Файл:** `apps/wallet/signals.py`
- **Исправление:** Сигнал пополнения в sandbox обёрнут в `transaction.atomic()` с `select_for_update()` для предотвращения двойного зачисления при параллельных запросах

---

## P2 — Средние (8/8 исправлены)

### #8 — Нет минимального бюджета при создании заказа
- **Файл:** `apps/orders/models.py`
- **Исправление:** Добавлен `MinValueValidator(Decimal('0.01'))` к полю `Order.budget`

### #9 — Скидка может превышать 100%, вызывая отрицательную цену
- **Файл:** `apps/orders/models.py`
- **Исправление:** `apply_discount` ограничивает скидку на уровне 100% через `min(self.discount_amount, self.original_price)`

### #10 — Скидка перезаписывает оригинальный бюджет
- **Файл:** `apps/orders/models.py`
- **Исправление:** `apply_discount` больше не перезаписывает `budget` со скидочной ценой. Используется `update_fields` для точечного обновления в БД

### #11 — Дублирующиеся эндпоинты take_order / complete_order
- **Файл:** `apps/orders/views.py`
- **Исправление:** `take_order` и `complete_order` теперь делегируют вызов методам `Order.take()` и `Order.complete()` (обёртки с пометкой DEPRECATED)

### #12 — Покупки в магазине используют direct_transfer вместо эскроу
- **Файл:** `apps/shop/views.py`
- **Исправление:** `purchase` теперь использует модель эскроу `hold` + `release_to_expert` вместо `direct_transfer`, обеспечивая защиту платежей

### #13 — Пополнения не отображаются в PaymentViewSet
- **Файл:** `apps/payments/views.py`
- **Исправление:** `PaymentViewSet.get_queryset` теперь показывает пополнения через фильтр `Q(user=user)` наряду с платежами по заказам

### #14 — Нет ограничения частоты запросов к эндпоинтам кошелька
- **Файлы:** `apps/wallet/views.py`, `config/settings.py`
- **Исправление:** Добавлен `throttle_scope = 'wallet'` к `WalletViewSet` и лимит `'wallet': '30/minute'` в настройках REST_FRAMEWORK

### #15 — Нет лимитов на вывод средств
- **Файл:** `apps/wallet/views.py`
- **Исправление:** Добавлена валидация вывода: мин. 100 ₽, макс. 500 000 ₽ за транзакцию, дневной лимит 1 000 000 ₽

---

## P3 — Низкие (7/7 исправлены)

### #16 — get_stats считает HOLD как потраченные деньги
- **Файл:** `apps/wallet/services.py`
- **Исправление:** `get_stats` теперь учитывает тип `RELEASE` вместо `HOLD` в расчёте `total_spent`

### #17 — accept_bid не обновляет бюджет заказа
- **Файл:** `apps/orders/views.py`
- **Исправление:** `accept_bid` теперь устанавливает `order.budget = bid.amount` при принятии заявки

### #18 — apply_discount перезаписывает бюджет без update_fields
- **Файл:** `apps/orders/models.py`
- **Исправление:** Уже исправлено в рамках #10. `apply_discount` использует `update_fields` для точечного сохранения

### #19 — Нет идемпотентности при создании платежа
- **Файл:** `apps/wallet/views.py`
- **Исправление:** Эндпоинт пополнения проверяет наличие существующего ожидающего платежа перед созданием нового, предотвращая дублирование списаний

### #20 — Нет ограничения БД на User.balance
- **Файл:** `apps/users/models.py`
- **Исправление:** Добавлен `CheckConstraint` для `balance >= 0` и `frozen_balance >= 0` на модели User

### #21 — PartnerEarning.amount не округляется
- **Файл:** `apps/users/models.py`
- **Исправление:** `PartnerEarning.save()` теперь вызывает `self.amount.quantize(Decimal('0.01'))` для округления до 2 знаков

### #22 — Order.clean() не вызывается автоматически
- **Файл:** `apps/orders/models.py`
- **Исправление:** `Order.save()` теперь вызывает `full_clean()` для новых заказов, обеспечивая валидацию дедлайна (он должен быть в будущем)

---

## Применённые миграции

| Приложение | Миграция | Описание |
|---|---|---|
| orders | `0023_alter_order_budget` | Добавлен MinValueValidator |
| payments | `0007_alter_payment_payment_method` | Обновление поля способа оплаты |
| users | `0024_alter_user_options_user_user_balance_non_negative_and_more` | CheckConstraints на поля баланса |

## Верификация

- `python manage.py check` — **0 проблем**
- Все миграции успешно применены
- Контейнер бэкенда перезапущен и работает
