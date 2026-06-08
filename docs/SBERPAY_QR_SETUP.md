# SberPay QR — настройка приёма платежей

Платформа: SberPay QR (приём оплат по QR-коду от клиента).
Авторизация: **mTLS** — клиентский сертификат + ключ.

## 1. Реквизиты терминала

Уже зашиты в `.env`:

| Поле | Значение |
|---|---|
| TID (ID терминала) | `43884154` |
| QR ID | `4001318889` |
| ID точки (memberId) | `191000342912` |
| Мерчант | `Око Знаний_QR` |
| Расчётный счёт | `40702 810 9 1675 0006885` |
| Адрес точки | Екатеринбург, ул. Щорса, 7 |

Источник: PDF от Сбера, выданный вместе с подписанием договора.

## 2. Что ещё нужно от Сбера, чтобы платежи реально пошли

1. **Сертификат клиента** (`client.pem`/`client.crt` + `client.key`,
   либо `client.p12`). Файлы для production кладём в:
   ```
   /root/OkoZnaniy/secrets/sberpay/
   ├── client.pem
   ├── client.key
   └── ca.pem    # опционально, если Сбер выдал свой root CA
   ```
   Права: владелец `root`, режим `600`.

2. **Пароль к сертификату** (если контейнер `.p12` или ключ зашифрован).
   Положи в `.env`:
   ```
   SBERPAY_QR_CERT_PASSWORD=…
   ```
   (опционально — нужно только если используем `.p12` и распаковываем
   ключ; для `.pem`/`.key` без пароля не требуется).

3. **PDF / Swagger API** под этот терминал. У Сбера несколько ревизий —
   нужны:
   - актуальные пути (`/qr/order/v3/creation`, `/qr/order/v3/status`,
     `/qr/order/v3/revoke`, `/qr/order/v3/refund`) — поправить в
     `apps/payments/providers/sberpay_qr.py` при расхождении;
   - формат поля `amount` (копейки vs рубли), наличие `currency`,
     обязательные поля (`rqUid`, `rqTm`, `paymentPurpose`);
   - формат webhook от Сбера (имя поля `orderStatus`, коды успеха).

4. **URL вебхука**, который надо прописать в личном кабинете Сбера:
   ```
   https://okoznaniy.ru/api/payments/sberpay-qr/callback/
   ```

## 3. Установка сертификата

```bash
# с локальной машины
scp client.pem client.key root@45.12.239.226:/root/OkoZnaniy/secrets/sberpay/

# на сервере
chmod 600 /root/OkoZnaniy/secrets/sberpay/*
chown root:root /root/OkoZnaniy/secrets/sberpay/*

# если выдан .p12 — распаковываем
cd /root/OkoZnaniy/secrets/sberpay/
openssl pkcs12 -in client.p12 -clcerts -nokeys -out client.pem
openssl pkcs12 -in client.p12 -nocerts -nodes -out client.key
```

## 4. Перезапуск

```bash
cd /root/OkoZnaniy
docker compose restart backend celery
```

Контейнер сам монтирует `./secrets:/app/secrets:ro`, перебилд не нужен.

## 5. Тестирование

1. Создать заказ от имени клиента.
2. В UI выбрать «СберPay QR».
3. На странице оплаты появится QR — отсканировать в SberPay.
4. После успешной оплаты Сбер отправит webhook на
   `/api/payments/sberpay-qr/callback/`.
5. Проверить статус платежа в админке Django (`/admin/payments/payment/`).

## 6. Безопасность

- Сертификат `client.key` НИКОГДА не коммитим в git и не кладём в Docker
  image. Только bind-mount.
- В `secrets/.gitignore` уже стоит `*`.
- Логи провайдера не пишут полное тело запроса (только ключи payload).

## 7. Чек-лист готовности к проду

- [ ] Положен `client.pem` и `client.key` в `secrets/sberpay/`
- [ ] `SBERPAY_QR_TEST_MODE=False` в `.env`
- [ ] В личном кабинете Сбера указан URL вебхука
- [ ] Прогнан тестовый платёж на 1 ₽, статус в БД `completed`
- [ ] Сверены коды статусов webhook со словарём `success_codes`/`fail_codes`
      в `sberpay_qr.py`
