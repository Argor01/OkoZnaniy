#!/usr/bin/env python3
"""
Проверка API заказов
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def setup_session():
    session = requests.Session()
    try:
        response = session.get(f"{BASE_URL}/admin/login/")
        if 'csrftoken' in session.cookies:
            csrf_token = session.cookies['csrftoken']
            
            login_data = {
                'username': 'testadmin',
                'password': 'testpass123',
                'csrfmiddlewaretoken': csrf_token
            }
            
            session.post(
                f"{BASE_URL}/admin/login/",
                data=login_data,
                headers={'Referer': f"{BASE_URL}/admin/login/"}
            )
    except Exception as e:
        print(f"Ошибка авторизации: {e}")
    
    return session

def main():
    session = setup_session()
    
    print("🔍 Проверка API заказов...")
    
    # Проверяем разные endpoints
    endpoints = [
        f"{API_BASE}/orders/",
        f"{API_BASE}/orders/orders/",
    ]
    
    for endpoint in endpoints:
        print(f"\n📡 Тестирую: {endpoint}")
        
        try:
            response = session.get(endpoint)
            print(f"Статус: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, dict):
                    print(f"Ключи: {list(data.keys())}")
                    
                    if 'orders' in data:
                        orders_url = data['orders']
                        print(f"URL заказов: {orders_url}")
                        
                        # Получаем заказы по URL
                        orders_response = session.get(orders_url)
                        if orders_response.status_code == 200:
                            orders = orders_response.json()
                            print(f"Заказов получено: {len(orders)}")
                            
                            # Анализируем заказы
                            completed_orders = []
                            total_revenue = 0
                            
                            for order in orders:
                                status = order.get('status', '')
                                final_price = order.get('final_price')
                                
                                if status == 'completed' and final_price:
                                    completed_orders.append(order)
                                    total_revenue += float(final_price)
                                    print(f"✅ Завершенный заказ: {order.get('title')} - {final_price} руб.")
                            
                            print(f"\n📊 ИТОГО:")
                            print(f"Всего заказов: {len(orders)}")
                            print(f"Завершенных заказов: {len(completed_orders)}")
                            print(f"Общая выручка: {total_revenue:.2f} руб.")
                            
                        else:
                            print(f"Ошибка получения заказов: {orders_response.status_code}")
                    
                elif isinstance(data, list):
                    print(f"Получен список из {len(data)} элементов")
                    
                    # Анализируем заказы
                    completed_orders = []
                    total_revenue = 0
                    
                    for order in data:
                        if isinstance(order, dict):
                            status = order.get('status', '')
                            final_price = order.get('final_price')
                            
                            if status == 'completed' and final_price:
                                completed_orders.append(order)
                                total_revenue += float(final_price)
                                print(f"✅ Завершенный заказ: {order.get('title')} - {final_price} руб.")
                    
                    print(f"\n📊 ИТОГО:")
                    print(f"Всего заказов: {len(data)}")
                    print(f"Завершенных заказов: {len(completed_orders)}")
                    print(f"Общая выручка: {total_revenue:.2f} руб.")
                
            else:
                print(f"Ошибка: {response.status_code}")
                print(f"Ответ: {response.text[:200]}...")
                
        except Exception as e:
            print(f"Ошибка: {e}")

if __name__ == "__main__":
    main()