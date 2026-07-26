# Финансовый аудит — OkoZnaniy (Эмулятор)

> **Дата:** 2026-07-26
> **Статус:** Анализ кодовой базы. Реальный счёт не подключён — все операции через эмулятор (sandbox / wallet).
> **Версия кодовой базы:** актуальная на момент проверки.

---

## 1. Архитектура финансовой системы (обзор)

### 1.1. Центральный ledger — `apps/wallet/services.py`

Все движения денег проходят через `WalletService`. Модель хранит два поля на пользователе:

| Поле | Назначение |
|---|---|
| `User.balance` | Доступный баланс |
| `User.frozen_balance` | Замороженная сумма (эскроу) |

**Доступный баланс** = `balance - frozen_balance`.

Операции (все обёрнуты в `@transaction.atomic` + `select_for_update`):

| Метод | Действие |
|---|---|
| `topup()` | `balance += amount` |
| `hold()` | `frozen_balance += amount` (проверка available >= amount) |
| `refund_hold()` | `frozen_balance -= amount` (разморозка, деньги остаются у клиента) |
| `release_to_expert()` | `frozen_balance -= amount`, `balance -= amount` (клиент платит), `expert.balance += payout`, `system.balance += fee` |
| `direct_transfer()` | `payer.balance -= amount` (без эскроу), `recipient.balance += payout`, `system.balance += fee` |
| `withdraw()` | `user.balance -= amount` (для вывода на карту) |

### 1.2. Типы транзакций (`orders.Transaction`)

| Тип | Описание |
|---|---|
| `topup` | Пополнение баланса |
| `hold` | Заморозка средств (эскроу) |
| `release` | Списание замороженных средств |
| `refund` | Возврат замороженных средств |
| `payout` | Выплата эксперту |
| `commission` | Комиссия платформы |
| `withdrawal` | Вывод средств на карту |
| `purchase` | Покупка готовой работы |

### 1.3. Комиссия платформы

- По умолчанию: **15%** (`PLATFORM_COMMISSION_PERCENT` в settings)
- Синтетический аккаунт: `_system_commission`
- Расчёт: `fee = amount * commission_percent / 100`, `payout = amount - fee`

### 1.4. Платёжные провайдеры

| Провайдер | Код | Назначение |
|---|---|---|
| Альфа-Банк | `alfabank.py` | Эквайринг (карта) |
| СБП | `sbp.py` | Система быстрых платежей |
| SberBank | `sberbank.py` | Заглушка |
| SberPay QR | `sberpay_qr.py` | Заглушка |

### 1.5. Sandbox-режим

- Включается через `PAYMENTS_SANDBOX=True`
- Доступен только для `is_staff` или `email.endswith('@okoznaniy.test')`
- При sandbox-пополнении платёж мгновенно становится `COMPLETED` без реального эквайринга
- Кредитование через сигнал `post_save` на `Payment` → `WalletService.topup()`

### 1.6. Финансовые флоу

#### Заказ (escrow):
```
Клиент пополняет баланс → topup
  ↓
Эксперт берёт заказ → hold (заморозка)
  ↓
Эксперт выполняет → review
  ↓
Клиент одобряет → release_to_expert (списание + выплата + комиссия)
```

#### Покупка в магазине (direct):
```
Покупатель оплачивает → direct_transfer (без эскроу)
  ↓
Продавец получает payout - fee
Платформа получает fee
```

---

## 2. Обнаруженные дыры и проблемы

### КРИТИЧЕСКИЕ (P0)

---

#### 2.1. Отмена просроченного заказа НЕ возвращает замороженные средства

**Файл:** `apps/orders/views.py:444-477` — метод `cancel_overdue`

```python
order.status = 'cancelled'
order.save(update_fields=['status', 'updated_at'])
# ← НЕТ вызова _refund_order_hold_if_any(order) !
```

**Проблема:** При отмене просроченного заказа клиентом средства остаются замороженными навсегда. Сравните с методом `reject()` (строка 787-788), который корректно вызывает `_refund_order_hold_if_any(order)`.

**Влияние:** Клиент теряет деньги. Замороженный баланс не отражает реальное состояние.

**Решение:** Добавить `_refund_order_hold_if_any(order)` перед сменой статуса в `cancel_overdue`.

---

#### 2.2. Удаление завершённого заказа уничтожает финансовую историю

**Файл:** `apps/orders/views.py:144-170` — метод `perform_destroy`
**Файл:** `apps/orders/models.py:374` — `Transaction.order` имеет `on_delete=CASCADE`

```python
# perform_destroy разрешает удаление completed заказов:
if instance.status not in ['new', 'completed']:
    raise PermissionDenied(...)

instance.delete()  # ← CASCADE удалит все Transaction!
```

**Проблема:** Удаление `completed` заказа каскадно удаляет ВСЕ связанные транзакции (hold, release, payout, commission). Финансовый леджер теряет записи.

**Влияние:** Невозможно восстановить историю платежей. Нарушается принцип неизменяемости бухгалтерских записей.

**Решение:** Либо запретить удаление `completed` заказов, либо заменить `CASCADE` на `SET_NULL` для `Transaction.order`.

---

#### 2.3. Callback платежа не проверяет подпись провайдера

**Файл:** `apps/payments/views.py:87-107`

```python
@action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
def process_callback(self, request, pk=None):
    payment = get_object_or_404(Payment, pk=pk)
    # ← Нет проверки подписи/хеша от платёжной системы
```

**Проблема:** Любой, кто знает `pk` платежа, может отправить поддельный callback и пометить платёж как завершённый. Эндпоинт открыт для всех (`AllowAny`).

**Влияние:** Теоретическая возможность получить деньги на баланс без реальной оплаты.

**Решение:** Реализовать проверку подписи/хеша от каждого провайдера (AlfaBank, СБП).

---

### ВЫСОКИЕ (P1)

---

#### 2.4. Hardcoded 70% экспертных выплат в finance-дашборде директора

**Файл:** `apps/director/views.py:637`

```python
expert_payments = total_income * Decimal('0.7')
```

**Проблема:** Реальная комиссия — 15% (настраивается),专家 получает 85%. Но дашборд считает расходы как 70% от дохода. Чистая прибыль отображается завышенной (~30% вместо реальных ~15% минус партнёры).

**Влияние:** Директор видит неверную картину прибыльности. Реальная маржа в ~2 раза ниже отображаемой.

**Решение:** Использовать реальные данные из `Transaction` с типом `PAYOUT` для расчёта выплат экспертам.

---

#### 2.5. Партнёрская комиссия — дополнительный расход, не учитывается в Pricing

**Файл:** `apps/wallet/tests.py:284-293`

```python
# При заказе на 1000₽:
# Эксперт получает: 850₽ (85%)
# Система получает: 150₽ (15%)
# Партнёр начисляет: 75₽ (7.5%) ← откуда эти деньги?
```

**Проблема:** Партнёрская комиссия (`PartnerEarning`) — это долг平台 перед партнёром. Деньги НЕ вычитаются из выплаты эксперту и НЕ берутся с клиента. Это дополнительный расход платформы.

**Влияние:** Реальная прибыль платформы с реферального заказа: `150₽ - 75₽ = 75₽` (а не 150₽). Finance-дашборд не учитывает этот расход корректно.

**Решение:** Либо вычитать партнёрскую комиссию из `system.balance` (комиссии платформы), либо учитывать `PartnerEarning` в finance-дашборде.

---

#### 2.6. `PaymentCrypto` генерирует новый ключ при каждом запуске, если не задан `PAYMENT_ENCRYPTION_KEY`

**Файл:** `apps/payments/crypto.py:10-13`
**Файл:** `config/settings.py:485`

```python
# crypto.py
key = getattr(settings, 'PAYMENT_ENCRYPTION_KEY', None)
if not key:
    key = Fernet.generate_key()  # ← новый ключ каждый раз!

# settings.py
PAYMENT_ENCRYPTION_KEY = os.getenv('PAYMENT_ENCRYPTION_KEY', Fernet.generate_key().decode())
```

**Проблема:** Если переменная `PAYMENT_ENCRYPTION_KEY` не задана в `.env`, при каждом перезапуске контейнера генерируется новый ключ. Все ранее зашифрованные данные становятся нечитаемыми.

**Влияние:** Потеря чувствительных данных платежей. `Payment.get_sensitive_data()` будет падать с ошибкой.

**Решение:** Обязательно задавать `PAYMENT_ENCRYPTION_KEY` в `.env`. В коде — добавить проверку при старте и логировать предупреждение.

---

#### 2.7. Гонка при sandbox-пополнении (двойное начисление)

**Файл:** `apps/wallet/views.py:70-85` + `apps/wallet/signals.py:22-47`

```python
# views.py — сохраняет платёж как COMPLETED
payment.status = PaymentStatus.COMPLETED
payment.save()

# signals.py — post_save вызывает topup
# Проверка дубликата:
if Transaction.objects.filter(payment_id=instance.pk).exists():
    return
```

**Проблема:** Проверка дубликата выполнена ВНЕ atomic-блока `WalletService.topup()`. При одновременных двух запросах оба могут пройти проверку до создания транзакции.

**Влияние:** Теоретическое двойное начисление средств.

**Решение:** Обернуть проверку + `topup` в единый `transaction.atomic` или использовать `select_for_update` на проверке.

---

### СРЕДНИЕ (P2)

---

#### 2.8. `budget=0` / `budget=None` — заказ без стоимости

**Файл:** `apps/orders/models.py:123-130`

```python
budget = models.DecimalField(
    max_digits=10, decimal_places=2,
    verbose_name="Бюджет",
    default=0, null=True, blank=True
)
```

**Проблема:** Заказ можно создать с нулевым или пустым бюджетом. При взятии в работу `hold()` не создаётся (amount <= 0), эксперт работает бесплатно.

**Решение:** Добавить валидацию `MinValueValidator(1)` или проверку в serializer.

---

#### 2.9. Скидка может сделать `final_price` отрицательным

**Файл:** `apps/orders/models.py:254-261`

```python
if discount.discount_type == 'percentage':
    self.discount_amount = (self.original_price * discount.value) / 100
    # ← Если value > 100, discount_amount > original_price!
```

**Файл:** `apps/catalog/models.py:308` — `DiscountRule.value` имеет только `MinValueValidator(0)`, без максимума.

**Проблема:** Процентная скидка > 100% делает `final_price` отрицательным. Клиент получает деньги за заказ.

**Решение:** Добавить `MaxValueValidator(100)` для процентных скидок или `max(discount_amount, 0)` в `apply_discount`.

---

#### 2.10. `budget` перезаписывается при применении скидки — искажает статистику

**Файл:** `apps/orders/models.py:260`

```python
self.budget = self.final_price  # ← budget перезаписывается!
```

**Проблема:** `director/views.py` turnover и net_profit читают `order.budget`. После скидки budget = discounted_price. Если скидка 50%, turnover отображается в 2 раза меньше реальной суммы сделки.

**Решение:** Не перезаписывать `budget`. Использовать `final_price` для расчётов, `budget` — для исходной суммы.

---

#### 2.11. Дублирующие эндпоинты `take` / `take_order` и `complete` / `complete_order`

**Файлы:** `apps/orders/views.py`

| Эндпоинт 1 | Эндпоинт 2 | Различия |
|---|---|---|
| `take()` (стр. 322) | `take_order()` (стр. 802) | `take_order` отправляет уведомления, `take` — нет |
| `complete()` (стр. 362) | `complete_order()` (стр. 846) | `complete_order` отправляет уведомления |

**Проблема:** Два пути для одного действия. Если обновить один, другой может остаться устаревшим. Разная логика уведомлений.

**Решение:** Оставить один эндпоинт, удалить дубликат.

---

#### 2.12. Покупка готовой работы без эскроу — нет защиты от спора

**Файл:** `apps/shop/views.py:139-189`

```python
WalletService.direct_transfer(
    payer=request.user, recipient=work.author,
    amount=work.price, order=order, ...
)
```

**Проблема:** Деньги сразу уходят продавцу. Если покупатель откроет спор, деньги уже у продавца. Нет механизма возврата через платформу.

**Решение:** Использовать `hold` + `release_to_expert` вместо `direct_transfer` для магазина.

---

#### 2.13. `PaymentViewSet.get_queryset` не показывает topup-платежи клиенту

**Файл:** `apps/payments/views.py:27-31`

```python
return self.queryset.filter(order__client=user)
```

**Проблема:** Topup-платежи имеют `order=None`. Фильтр `order__client=user` их не находит. Пользователь не видит историю своих пополнений.

**Решение:** Добавить `| Q(user=user, purpose='topup')` в фильтр.

---

#### 2.14. Нет rate limiting на пополнение/вывод

**Файлы:** `apps/wallet/views.py:56-128`

**Проблема:** Нет ограничений на количество или сумму операций за период. Возможен спам-атака на пополнение/вывод.

**Решение:** Добавить `throttling` на ViewSet или проверки в сервисном слое.

---

#### 2.15. Нет минимальной/максимальной суммы вывода

**Файл:** `apps/wallet/views.py:100-128`

**Проблема:** Можно вывести любую сумму (даже 0.01₽). Нет лимитов на дневной вывод.

**Решение:** Добавить валидацию min/max суммы и дневной лимит.

---

### НИЗКИЕ (P3)

---

#### 2.16. `get_stats` считает HOLD как " потрачено"

**Файл:** `apps/wallet/services.py:100-103`

```python
total_spent = qs.filter(type__in=[
    TransactionType.PURCHASE,
    TransactionType.HOLD,  # ← HOLD временный, не реальный расход
])
```

**Проблема:** Hold — временная заморозка, не расход. Статистика "потрачено" завышена на сумму активных холдов.

**Решение:** Считать `total_spent` как `RELEASE + PURCHASE` (фактические списания).

---

#### 2.17. `accept_bid` не обновляет `budget` до `bid.amount`

**Файл:** `apps/orders/views.py:517-518`

```python
order.expert = bid.expert
order.status = 'awaiting_expert_acceptance'
# ← order.budget НЕ обновлён до bid.amount
```

**Проблема:** Бюджет остаётся исходным. Обновляется только в `accept_assignment`. Если эксперт отклонит приглашение, budget не отражает ставку.

**Решение:** Установить `order.budget = bid.amount` при `accept_bid`.

---

#### 2.18. `apply_discount` вызывает `self.save()` без `update_fields`

**Файл:** `apps/orders/models.py:261`

```python
self.save()  # ← Сохраняет ВСЕ поля
```

**Проблема:** Могут конфликтовать с `auto_now` полями. Нарушение Django best practice.

**Решение:** `self.save(update_fields=['discount', 'original_price', 'discount_amount', 'final_price', 'budget'])`

---

#### 2.19. Нет idempotency key на создание платежа

**Файлы:** `apps/wallet/views.py:62-68`, `apps/payments/services.py:17-25`

```python
payment_id=f'topup-{request.user.pk}-{uuid.uuid4().hex}'  # всегда уникален
```

**Проблема:** При двойном клике создаются два платежа вместо возврата существующего.

**Решение:** Использовать фиксированный idempotency key (например, хеш от user+amount+timestamp).

---

#### 2.20. Нет защиты от отрицательного `balance`

**Проблема:** Поле `User.balance` не имеет `CheckConstraint` на `balance >= 0`. При ошибке в коде баланс может уйти в минус.

**Решение:** Добавить `CheckConstraint(check=Q(balance__gte=0))` в модель User.

---

#### 2.21. Партнёрский заработок имеет 4 знака после запятой

**Файл:** `apps/users/models.py:213`

```python
amount = models.DecimalField(max_digits=10, decimal_places=4)
```

**Проблема:** Отображается как `75.0000₽`. Выглядит неэстетично.

**Решение:** Округлять до 2 знаков при отображении или хранении.

---

#### 2.22. `clean()` на модели Order не вызывается автоматически

**Файл:** `apps/orders/models.py:274-278`

**Проблема:** Django не вызывает `clean()` при `save()` по умолчанию. Валидация дедлайна работает только через `perform_create` в view. Прямое `Order.objects.create(deadline=past_date)` пройдёт.

**Решение:** Вызывать `full_save()` или добавить проверку в `save()`.

---

## 3. Сводная таблица

| # | Тип | Описание | Файл | Строка |
|---|---|---|---|---|
| 2.1 | **P0** | cancel_overdue не возвращает hold | orders/views.py | 444-477 |
| 2.2 | **P0** | Удаление completed order уничтожает транзакции | orders/views.py + models.py | 144-170, 374 |
| 2.3 | **P0** | Callback без проверки подписи | payments/views.py | 87-107 |
| 2.4 | **P1** | Hardcoded 70% в finance-дашборде | director/views.py | 637 |
| 2.5 | **P1** | Партнёрская комиссия не учтена | wallet/tests.py | 284-293 |
| 2.6 | **P1** | Ключ шифрования генерируется заново | payments/crypto.py + settings.py | 10-13, 485 |
| 2.7 | **P1** | Гонка при sandbox topup | wallet/views.py + signals.py | 70-85, 22-47 |
| 2.8 | **P2** | budget=0 допустим | orders/models.py | 123-130 |
| 2.9 | **P2** | Скидка > 100% | orders/models.py + catalog/models.py | 254-261, 308 |
| 2.10 | **P2** | budget перезаписывается скидкой | orders/models.py | 260 |
| 2.11 | **P2** | Дублирующие эндпоинты | orders/views.py | 322/802, 362/846 |
| 2.12 | **P2** | Shop без эскроу | shop/views.py | 139-189 |
| 2.13 | **P2** | Topup не видны клиенту | payments/views.py | 27-31 |
| 2.14 | **P2** | Нет rate limiting | wallet/views.py | 56-128 |
| 2.15 | **P2** | Нет лимитов на вывод | wallet/views.py | 100-128 |
| 2.16 | **P3** | HOLD считается как расход | wallet/services.py | 100-103 |
| 2.17 | **P3** | accept_bid не обновляет budget | orders/views.py | 517-518 |
| 2.18 | **P3** | save() без update_fields | orders/models.py | 261 |
| 2.19 | **P3** | Нет idempotency key | wallet/views.py + payments/services.py | 62-68, 17-25 |
| 2.20 | **P3** | Нет CheckConstraint на balance | users/models.py | 42 |
| 2.21 | **P3** | 4 знака у партнёрского заработка | users/models.py | 213 |
| 2.22 | **P3** | clean() не вызывается автоматически | orders/models.py | 274-278 |

---

## 4. Рекомендации по 우선итетам

### Немедленно (перед запуском реальных платежей):
1. **#2.3** — Реализовать подпись callback от провайдеров
2. **#2.1** — Добавить refund_hold в cancel_overdue
3. **#2.2** — Запретить удаление completed заказов или перейти на SET_NULL для Transaction.order
4. **#2.6** — Гарантировать наличие PAYMENT_ENCRYPTION_KEY в .env

### Скоро (при приближении к production):
5. **#2.4** — Пересчитывать finance-дашборд по реальным данным
6. **#2.5** — Учитывать партнёрские выплаты в finance-дашборде
7. **#2.7** — Исправить гонку при sandbox topup
8. **#2.9** — Ограничить max скидку до 100%
9. **#2.12** — Добавить эскроу для магазина

### Планово (улучшение качества):
10. Остальные P2/P3issues по таблице

---

## 5. Структура файлов финансовой системы

```
apps/
├── wallet/
│   ├── services.py          — Центральный ledger (WalletService)
│   ├── models.py            — WithdrawalRequest
│   ├── views.py             — API пополнения/вывода
│   ├── signals.py           — Автокредитование при topup
│   └── tests.py             — Тесты кошелька
├── payments/
│   ├── services.py          — Создание платежей, callback
│   ├── models.py            — Payment, PaymentMethod, PaymentStatus
│   ├── views.py             — API платежей, callback endpoint
│   ├── config.py            — Настройки провайдеров
│   ├── crypto.py            — Шифрование платёжных данных
│   └── providers/
│       ├── alfabank.py      — Альфа-Банк эквайринг
│       └── sbp.py           — СБП
├── orders/
│   ├── models.py            — Order, Transaction, TransactionType, Bid
│   ├── services.py          — OrderActionService, DiscountService
│   └── views.py             — CRUD заказов + финансовые флоу
├── shop/
│   ├── models.py            — ReadyWork, Purchase
│   └── views.py             — Покупка готовых работ (direct_transfer)
├── director/
│   ├── models.py            — ManualIncome, ManualExpense
│   └── views.py             — Finance-дашборд директора
└── users/
    ├── models.py            — User.balance, PartnerEarning
    └── serializers.py       — Регистрация с реферальным кодом
```

---

## 6. Sandbox-тестирование

Для проверки финансовых флоу в sandbox-режиме:

```bash
# Включить sandbox
export PAYMENTS_SANDBOX=True

# Создать тестового пользователя
# email должен заканчиваться на @okoznaniy.test

# Пополнить кошелёк
POST /api/wallet/topup/
{"amount": "5000.00", "payment_method": "sberpay_qr"}
# Ответ: sandbox=true, balance обновлён

# Проверить баланс
GET /api/wallet/me/

# Создать заказ и провести полный флоу:
# 1. POST /api/orders/orders/ (создание)
# 2. POST /api/orders/orders/{id}/take/ (эксперт берёт → hold)
# 3. POST /api/orders/orders/{id}/submit/ (отправка на проверку)
# 4. POST /api/orders/orders/{id}/approve/ (одобрение → release + payout)
```

Тест `test_approve_releases_order_hold_to_expert_with_commission` в `apps/wallet/tests.py` покрывает полный флоу.
