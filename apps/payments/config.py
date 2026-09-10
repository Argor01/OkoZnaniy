from django.conf import settings

# Настройки для API Альфа-Банка
ALFABANK_SETTINGS = {
    'API_URL': getattr(settings, 'ALFABANK_API_URL', 'https://payment.alfabank.ru/payment/rest/'),
    'USERNAME': getattr(settings, 'ALFABANK_USERNAME', ''),
    'PASSWORD': getattr(settings, 'ALFABANK_PASSWORD', ''),
    'TEST_MODE': getattr(settings, 'ALFABANK_TEST_MODE', True),
}

# Настройки для СБП
SBP_SETTINGS = {
    'API_URL': getattr(settings, 'SBP_API_URL', 'https://qr.nspk.ru/'),
    'MERCHANT_ID': getattr(settings, 'SBP_MERCHANT_ID', ''),
    'API_KEY': getattr(settings, 'SBP_API_KEY', ''),
    'TEST_MODE': getattr(settings, 'SBP_TEST_MODE', True),
}

# Общие настройки
PAYMENT_SETTINGS = {
    'SUCCESS_URL': getattr(settings, 'PAYMENT_SUCCESS_URL', '/payment/success/'),
    'FAIL_URL': getattr(settings, 'PAYMENT_FAIL_URL', '/payment/fail/'),
    'NOTIFICATION_URL': getattr(settings, 'PAYMENT_NOTIFICATION_URL', '/api/payments/callback/'),
}

URALSIB_SETTINGS = {
    # Тестовый контур: https://uralsib.rbsuat.com/payment/rest
    # Боевой URL банк сообщает при подключении.
    'API_URL': getattr(settings, 'URALSIB_API_URL', 'https://uralsib.rbsuat.com/payment/rest'),
    'USERNAME': getattr(settings, 'URALSIB_USERNAME', ''),
    'PASSWORD': getattr(settings, 'URALSIB_PASSWORD', ''),
    'CALLBACK_SECRET': getattr(settings, 'URALSIB_CALLBACK_SECRET', ''),
    'SUCCESS_URL': getattr(settings, 'URALSIB_SUCCESS_URL', ''),
    'FAIL_URL': getattr(settings, 'URALSIB_FAIL_URL', ''),
    'CURRENCY': getattr(settings, 'URALSIB_CURRENCY', '643'),
    'TIMEOUT': getattr(settings, 'URALSIB_TIMEOUT', 20),
}

SBERBANK_SETTINGS = {
    # Тестовый контур: https://3dsec.sberbank.ru/payment/rest
    # Боевой URL банк сообщает при подключении.
    'API_URL': getattr(settings, 'SBERBANK_API_URL', 'https://3dsec.sberbank.ru/payment/rest'),
    'USERNAME': getattr(settings, 'SBERBANK_USERNAME', ''),
    'PASSWORD': getattr(settings, 'SBERBANK_PASSWORD', ''),
    'CALLBACK_SECRET': getattr(settings, 'SBERBANK_CALLBACK_SECRET', ''),
    'SUCCESS_URL': getattr(settings, 'SBERBANK_SUCCESS_URL', ''),
    'FAIL_URL': getattr(settings, 'SBERBANK_FAIL_URL', ''),
    'CURRENCY': getattr(settings, 'SBERBANK_CURRENCY', '643'),
    'TIMEOUT': getattr(settings, 'SBERBANK_TIMEOUT', 20),
}

TBANK_SETTINGS = {
    'API_URL': getattr(settings, 'TBANK_API_URL', 'https://securepay.tinkoff.ru/v2'),
    'TERMINAL_KEY': getattr(settings, 'TBANK_TERMINAL_KEY', ''),
    'PASSWORD': getattr(settings, 'TBANK_PASSWORD', ''),
    'TEST_MODE': getattr(settings, 'TBANK_TEST_MODE', False),
    'NOTIFICATION_URL': getattr(settings, 'TBANK_NOTIFICATION_URL', ''),
    'SUCCESS_URL': getattr(settings, 'TBANK_SUCCESS_URL', ''),
    'FAIL_URL': getattr(settings, 'TBANK_FAIL_URL', ''),
}

YOOKASSA_SETTINGS = {
    # Адрес один для боевого и тестового магазина: тестовость определяет
    # секретный ключ вида test_*.
    'API_URL': getattr(settings, 'YOOKASSA_API_URL', 'https://api.yookassa.ru/v3'),
    'SHOP_ID': getattr(settings, 'YOOKASSA_SHOP_ID', ''),
    'SECRET_KEY': getattr(settings, 'YOOKASSA_SECRET_KEY', ''),
    'RETURN_URL': getattr(settings, 'YOOKASSA_RETURN_URL', ''),
    'CURRENCY': getattr(settings, 'YOOKASSA_CURRENCY', 'RUB'),
    'TIMEOUT': getattr(settings, 'YOOKASSA_TIMEOUT', 20),
}
