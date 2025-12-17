#!/usr/bin/env python
"""
Скрипт для тестирования логина через API
"""
import requests
import json

# Тестовые данные
test_cases = [
    {
        "name": "Login with email",
        "username": "amuhaceva3@gmail.com",
        "password": "12345678"
    },
    {
        "name": "Login with username",
        "username": "AnitaM",
        "password": "12345678"
    },
    {
        "name": "Test admin email",
        "username": "administrator@test.com",
        "password": "test123"
    },
    {
        "name": "Test admin username",
        "username": "administrator",
        "password": "test123"
    }
]

url = "http://localhost:8000/api/users/token/"

print("=" * 60)
print("TESTING LOGIN API")
print("=" * 60)

for test in test_cases:
    print(f"\n{test['name']}:")
    print(f"  Username: {test['username']}")
    print(f"  Password: {test['password']}")
    
    try:
        response = requests.post(
            url,
            json={
                "username": test['username'],
                "password": test['password']
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ SUCCESS!")
            print(f"  User: {data.get('user', {}).get('username')}")
            print(f"  Role: {data.get('user', {}).get('role')}")
        else:
            print(f"  ❌ FAILED!")
            try:
                error = response.json()
                print(f"  Error: {json.dumps(error, indent=2)}")
            except:
                print(f"  Error: {response.text}")
    except Exception as e:
        print(f"  ❌ EXCEPTION: {str(e)}")

print("\n" + "=" * 60)
