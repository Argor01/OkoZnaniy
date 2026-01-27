#!/usr/bin/env python
"""
Тест API для статистики "Мои работы"
"""
import requests
import json

def test_api_stats():
    """Тестируем API статистики"""
    base_url = 'http://127.0.0.1:8000'
    
    print("=== Тестирование API статистики ===")
    
    # Тестируем без авторизации
    print("\n1. Тест без авторизации:")
    response = requests.get(f'{base_url}/api/orders/orders/', params={'status': 'completed'})
    print(f"Статус: {response.status_code}")
    if response.status_code == 401:
        print("✅ Правильно требует авторизацию")
    else:
        print("❌ Должен требовать авторизацию")
    
    # Тестируем с неправильными данными авторизации
    print("\n2. Тест с неправильной авторизацией:")
    headers = {'Authorization': 'Bearer invalid_token'}
    response = requests.get(f'{base_url}/api/orders/orders/', headers=headers, params={'status': 'completed'})
    print(f"Статус: {response.status_code}")
    
    # Попробуем получить токен (если есть тестовый пользователь)
    print("\n3. Попытка авторизации:")
    login_data = {
        'username': 'testexpert',
        'password': 'testpass123'
    }
    
    try:
        login_response = requests.post(f'{base_url}/api/users/token/', json=login_data)
        print(f"Логин статус: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access')
            
            if access_token:
                print("✅ Успешная авторизация")
                
                # Тестируем API с токеном
                headers = {'Authorization': f'Bearer {access_token}'}
                
                print("\n4. Тест завершенных работ:")
                response = requests.get(f'{base_url}/api/orders/orders/', headers=headers, params={'status': 'completed'})
                print(f"Статус: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', data) if isinstance(data, dict) else data
                    print(f"Количество завершенных работ: {len(results)}")
                    
                    # Проверяем структуру данных
                    if results:
                        work = results[0]
                        print(f"Пример работы:")
                        print(f"  ID: {work.get('id')}")
                        print(f"  Название: {work.get('title')}")
                        print(f"  Бюджет: {work.get('budget')} ₽")
                        print(f"  Рейтинг: {work.get('rating', 'Нет рейтинга')}")
                        print(f"  Статус: {work.get('status')}")
                        
                        # Проверяем наличие поля rating
                        if 'rating' in work:
                            print("✅ Поле rating присутствует в ответе")
                        else:
                            print("❌ Поле rating отсутствует в ответе")
                
                print("\n5. Тест работ в процессе:")
                response = requests.get(f'{base_url}/api/orders/orders/', headers=headers, params={'status': 'in_progress'})
                print(f"Статус: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', data) if isinstance(data, dict) else data
                    print(f"Количество работ в процессе: {len(results)}")
                
                print("\n6. Тест всех работ эксперта:")
                response = requests.get(f'{base_url}/api/orders/orders/', headers=headers)
                print(f"Статус: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', data) if isinstance(data, dict) else data
                    print(f"Общее количество работ: {len(results)}")
                    
                    # Группируем по статусам
                    status_counts = {}
                    total_income = 0
                    ratings = []
                    
                    for work in results:
                        status = work.get('status')
                        status_counts[status] = status_counts.get(status, 0) + 1
                        
                        if status == 'completed':
                            budget = float(work.get('budget', 0))
                            total_income += budget
                            
                            rating = work.get('rating')
                            if rating is not None:
                                ratings.append(rating)
                    
                    print(f"\nСтатистика по статусам:")
                    for status, count in status_counts.items():
                        print(f"  {status}: {count}")
                    
                    print(f"\nРасчетная статистика:")
                    print(f"  Завершенные работы: {status_counts.get('completed', 0)}")
                    print(f"  В работе: {status_counts.get('in_progress', 0)}")
                    print(f"  Общий доход: {total_income:,.0f} ₽")
                    
                    if ratings:
                        avg_rating = sum(ratings) / len(ratings)
                        print(f"  Средний рейтинг: {avg_rating:.1f}")
                    else:
                        print(f"  Средний рейтинг: 0.0")
            else:
                print("❌ Не удалось получить токен")
        else:
            print(f"❌ Ошибка авторизации: {login_response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Не удается подключиться к серверу. Убедитесь, что сервер запущен на http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == '__main__':
    test_api_stats()