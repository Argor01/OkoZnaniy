"""
Тестовый скрипт для проверки Telegram авторизации
"""
import requests
import hashlib
import hmac
from datetime import datetime

# Настройки
API_URL = "http://localhost:8000/api/users/telegram_auth/"
BOT_TOKEN = "8584999235:AAGKcP0nhnn_B6G8iTa2Ti8U9oxUFByWfpo"

def generate_telegram_hash(data, bot_token):
    """Генерирует hash для Telegram данных"""
    # Создаем строку для проверки
    check_data = {k: v for k, v in data.items() if k != 'hash'}
    data_check_string = '\n'.join([f'{k}={v}' for k, v in sorted(check_data.items())])
    
    # Создаем секретный ключ
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Вычисляем hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash

def test_telegram_auth():
    """Тестирует Telegram авторизацию"""
    
    # Тестовые данные пользователя
    telegram_data = {
        'id': 123456789,
        'first_name': 'Test',
        'last_name': 'User',
        'username': 'testuser',
        'photo_url': 'https://example.com/photo.jpg',
        'auth_date': int(datetime.now().timestamp()),
    }
    
    # Генерируем hash
    telegram_data['hash'] = generate_telegram_hash(telegram_data, BOT_TOKEN)
    
    print("Отправка запроса на авторизацию...")
    print(f"Данные: {telegram_data}")
    
    try:
        response = requests.post(API_URL, json=telegram_data)
        
        print(f"\nСтатус: {response.status_code}")
        print(f"Ответ: {response.json()}")
        
        if response.status_code == 200:
            print("\n✅ Авторизация успешна!")
            data = response.json()
            print(f"Access Token: {data['access'][:50]}...")
            print(f"User ID: {data['user']['id']}")
            print(f"Username: {data['user']['username']}")
            print(f"Telegram ID: {data['user']['telegram_id']}")
        else:
            print("\n❌ Ошибка авторизации")
            
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Тест Telegram авторизации")
    print("=" * 50)
    test_telegram_auth()
