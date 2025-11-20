import requests

print("🧪 Тестирование Google OAuth...")
print("=" * 60)

# Попробуем разные URL
urls = [
    "http://127.0.0.1:8000/api/accounts/google/login/",
    "http://localhost:8000/api/accounts/google/login/",
]

for url in urls:
    print(f"\n📍 Тестирую: {url}")
    try:
        response = requests.get(url, allow_redirects=False)
        print(f"   Статус: {response.status_code}")
        
        if response.status_code == 302:
            redirect_url = response.headers.get('Location', '')
            print(f"   ✅ Перенаправление на: {redirect_url[:80]}...")
            
            if 'accounts.google.com' in redirect_url:
                print(f"\n🎉 УСПЕХ! Google OAuth работает!")
                print(f"   Рабочий URL: {url}")
                break
        elif response.status_code == 404:
            print(f"   ❌ 404 Not Found")
        else:
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")

print("\n" + "=" * 60)
