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