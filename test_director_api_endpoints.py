#!/usr/bin/env python3
"""
Тест API endpoints кабинета директора
"""

import requests
import json
from datetime import datetime

# Конфигурация
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Цвета для вывода
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message.center(60)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

def test_endpoint(url, description, expected_keys=None):
    """Тестирует один endpoint"""
    try:
        response = requests.get(url)
        print_info(f"Тестирую: {url}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print_success(f"{description}: OK")
                
                if isinstance(data, list):
                    print_info(f"  Количество элементов: {len(data)}")
                    if data and isinstance(data[0], dict):
                        print_info(f"  Ключи первого элемента: {list(data[0].keys())}")
                elif isinstance(data, dict):
                    print_info(f"  Ключи данных: {list(data.keys())}")
                    
                    # Проверяем ожидаемые ключи
                    if expected_keys:
                        missing_keys = set(expected_keys) - set(data.keys())
                        if missing_keys:
                            print_warning(f"  Отсутствуют ключи: {missing_keys}")
                        else:
                            print_success(f"  Все ожидаемые ключи присутствуют")
                
                # Показываем первые несколько значений
                if isinstance(data, dict):
                    for key, value in list(data.items())[:3]:
                        print_info(f"    {key}: {value}")
                        
                return True, data
                
            except json.JSONDecodeError:
                print_error(f"{description}: Ответ не является JSON")
                print_info(f"  Ответ: {response.text[:200]}...")
                return False, None
                
        elif response.status_code == 404:
            print_error(f"{description}: Endpoint не найден (404)")
            return False, None
        elif response.status_code == 401:
            print_error(f"{description}: Требуется авторизация (401)")
            return False, None
        elif response.status_code == 403:
            print_error(f"{description}: Доступ запрещен (403)")
            return False, None
        else:
            print_error(f"{description}: HTTP {response.status_code}")
            print_info(f"  Ответ: {response.text[:200]}...")
            return False, None
            
    except requests.exceptions.ConnectionError:
        print_error(f"{description}: Не удается подключиться к серверу")
        return False, None
    except Exception as e:
        print_error(f"{description}: {str(e)}")
        return False, None

def main():
    print_header("ТЕСТ API ENDPOINTS КАБИНЕТА ДИРЕКТОРА")
    
    # Проверяем доступность сервера
    print_info("Проверка доступности сервера...")
    try:
        response = requests.get(f"{BASE_URL}/api/health/")
        if response.status_code == 200:
            print_success("Сервер доступен")
        else:
            print_warning(f"Сервер отвечает с кодом {response.status_code}")
    except:
        print_error("Сервер недоступен")
        return
    
    # Тестируем основные endpoints
    print_header("ОСНОВНЫЕ ENDPOINTS")
    
    endpoints = [
        # Основные данные
        (f"{API_BASE}/orders/", "Заказы"),
        (f"{API_BASE}/users/", "Пользователи"),
        
        # Director API endpoints (согласно urls.py)
        (f"{API_BASE}/director/personnel/", "Персонал директора"),
        (f"{API_BASE}/director/finance/", "Финансы директора"),
        (f"{API_BASE}/director/partners/", "Партнеры директора"),
        (f"{API_BASE}/director/statistics/", "Статистика директора"),
        (f"{API_BASE}/director/personnel/expert-applications/", "Заявки экспертов"),
    ]
    
    results = {}
    
    for url, description in endpoints:
        success, data = test_endpoint(url, description)
        results[description] = success
    
    # Тестируем специфические действия ViewSet-ов
    print_header("СПЕЦИФИЧЕСКИЕ ДЕЙСТВИЯ VIEWSET")
    
    # Для ViewSet-ов проверяем доступные действия
    viewset_actions = [
        (f"{API_BASE}/director/finance/revenue/", "Выручка"),
        (f"{API_BASE}/director/finance/expenses/", "Расходы"),
        (f"{API_BASE}/director/finance/profit/", "Прибыль"),
        (f"{API_BASE}/director/statistics/overview/", "Обзор статистики"),
        (f"{API_BASE}/director/statistics/kpi/", "KPI"),
        (f"{API_BASE}/director/personnel/performance/", "Производительность персонала"),
    ]
    
    for url, description in viewset_actions:
        success, data = test_endpoint(url, description)
        results[description] = success
    
    # Проверяем с параметрами периода
    print_header("ТЕСТ С ПАРАМЕТРАМИ ПЕРИОДА")
    
    periods = ['week', 'month', 'quarter', 'year']
    for period in periods:
        print_info(f"Тестирование периода: {period}")
        period_endpoints = [
            (f"{API_BASE}/director/finance/revenue/?period={period}", f"Выручка за {period}"),
            (f"{API_BASE}/director/finance/profit/?period={period}", f"Прибыль за {period}"),
        ]
        
        for url, description in period_endpoints:
            success, data = test_endpoint(url, description)
            results[description] = success
    
    # Итоговый отчет
    print_header("ИТОГОВЫЙ ОТЧЕТ")
    
    total_tests = len(results)
    passed_tests = sum(1 for success in results.values() if success)
    
    print_info(f"Всего тестов: {total_tests}")
    print_info(f"Пройдено: {passed_tests}")
    print_info(f"Не пройдено: {total_tests - passed_tests}")
    
    if passed_tests == total_tests:
        print_success("ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
    else:
        print_warning("НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ")
        
        # Показываем какие тесты не прошли
        failed_tests = [name for name, success in results.items() if not success]
        print_error("Не прошедшие тесты:")
        for test_name in failed_tests:
            print_error(f"  - {test_name}")
    
    # Рекомендации
    print_header("РЕКОМЕНДАЦИИ")
    
    if not results.get("Персонал директора", False):
        print_warning("API директора может требовать авторизации")
        print_info("Рекомендация: Проверить настройки аутентификации")
    
    if not results.get("Заказы", False):
        print_warning("Основные данные недоступны")
        print_info("Рекомендация: Проверить работу основного API")
    
    print_info("Для полного тестирования рекомендуется:")
    print_info("1. Настроить аутентификацию")
    print_info("2. Создать тестовые данные")
    print_info("3. Проверить права доступа")

if __name__ == "__main__":
    main()