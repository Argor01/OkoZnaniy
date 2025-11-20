import requests

url = 'http://localhost:8000/api/accounts/google/login/?process=login'
print(f"Testing: {url}")

try:
    r = requests.get(url, allow_redirects=False, timeout=5)
    print(f"Status: {r.status_code}")
    
    if r.status_code == 302:
        location = r.headers.get('Location', '')
        print(f"Redirect to: {location[:150]}...")
        
        if 'accounts.google.com' in location:
            print("✅ SUCCESS! Redirects to Google")
        else:
            print(f"⚠️  Redirects to: {location}")
    else:
        print(f"❌ Expected 302, got {r.status_code}")
        print(f"Response: {r.text[:300]}")
        
except requests.Timeout:
    print("❌ TIMEOUT! Server не отвечает")
except Exception as e:
    print(f"❌ Error: {e}")
