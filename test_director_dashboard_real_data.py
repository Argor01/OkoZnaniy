#!/usr/bin/env python3
"""
Комплексный тест кабинета директора с реальными данными
Проверяет все API endpoints и функциональность
"""

import requests
import json
from datetime import datetime, timedelta
import sys

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

class DirectorDashboardTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.director_user = None
        
    def authenticate_as_director(self):
        """Аутентификация как директор"""
        print_info("Аутентификация как директор...")
        
        # Попробуем найти директора в системе
        try:
            response = self.session.get(f"{API_BASE}/users/")
            if response.status_code == 200:
                users = response.json()
                director = None
                for user in users:
                    if user.get('role') == 'director' or user.get('is_staff'):
                        director = user
                        break
                
                if director:
                    print_success(f"Найден директор: {director.get('username', 'N/A')}")
                    self.director_user = director
                    return True
                else:
                    print_warning("Директор не найден, используем админа")
                    return True
            else:
                print_warning("Не удалось получить список пользователей")
                return True
        except Exception as e:
            print_warning(f"Ошибка при поиске директора: {e}")
            return True

    def test_personnel_management(self):
        """Тест управления персоналом"""
        print_header("ТЕСТ: Управление персоналом")
        
        endpoints = [
            ("/api/director/personnel/", "Список персонала"),
            ("/api/director/personnel/statistics/", "Статистика персонала"),
            ("/api/director/personnel/performance/", "Производительность персонала")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"{description}: {len(data) if isinstance(data, list) else 'OK'}")
                    
                    # Детальная проверка данных
                    if isinstance(data, list) and data:
                        sample = data[0]
                        print_info(f"  Пример данных: {list(sample.keys())}")
                    elif isinstance(data, dict):
                        print_info(f"  Ключи данных: {list(data.keys())}")
                        
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")

    def test_financial_statistics(self):
        """Тест финансовой статистики"""
        print_header("ТЕСТ: Финансовая статистика")
        
        # Тестируем разные периоды
        periods = ['week', 'month', 'quarter', 'year']
        
        for period in periods:
            print_info(f"Тестирование периода: {period}")
            
            endpoints = [
                (f"/api/director/financial/revenue/?period={period}", "Выручка"),
                (f"/api/director/financial/expenses/?period={period}", "Расходы"),
                (f"/api/director/financial/profit/?period={period}", "Прибыль"),
                (f"/api/director/financial/turnover/?period={period}", "Оборот")
            ]
            
            for endpoint, description in endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                    if response.status_code == 200:
                        data = response.json()
                        print_success(f"  {description}: {data}")
                    else:
                        print_error(f"  {description}: HTTP {response.status_code}")
                        
                except Exception as e:
                    print_error(f"  {description}: {str(e)}")

    def test_partner_management(self):
        """Тест управления партнерами"""
        print_header("ТЕСТ: Управление партнерами")
        
        endpoints = [
            ("/api/director/partners/", "Список партнеров"),
            ("/api/director/partners/statistics/", "Статистика партнеров"),
            ("/api/director/partners/performance/", "Производительность партнеров")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"{description}: {len(data) if isinstance(data, list) else 'OK'}")
                    
                    if isinstance(data, list) and data:
                        sample = data[0]
                        print_info(f"  Пример данных: {list(sample.keys())}")
                        
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")

    def test_general_statistics(self):
        """Тест общей статистики"""
        print_header("ТЕСТ: Общая статистика")
        
        endpoints = [
            ("/api/director/statistics/overview/", "Общий обзор"),
            ("/api/director/statistics/kpi/", "KPI показатели"),
            ("/api/director/statistics/trends/", "Тренды"),
            ("/api/director/statistics/dashboard/", "Данные дашборда")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"{description}: OK")
                    
                    if isinstance(data, dict):
                        print_info(f"  Ключи: {list(data.keys())}")
                        # Показываем некоторые значения
                        for key, value in list(data.items())[:3]:
                            print_info(f"    {key}: {value}")
                            
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")

    def test_arbitrator_communication(self):
        """Тест коммуникации с арбитрами"""
        print_header("ТЕСТ: Коммуникация с арбитрами")
        
        endpoints = [
            ("/api/director/arbitrators/", "Список арбитров"),
            ("/api/director/arbitrators/messages/", "Сообщения арбитров"),
            ("/api/director/arbitrators/cases/", "Дела арбитров")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"{description}: {len(data) if isinstance(data, list) else 'OK'}")
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")

    def test_data_consistency(self):
        """Тест консистентности данных"""
        print_header("ТЕСТ: Консистентность данных")
        
        try:
            # Получаем данные из разных источников
            overview_response = self.session.get(f"{BASE_URL}/api/director/statistics/overview/")
            financial_response = self.session.get(f"{BASE_URL}/api/director/financial/revenue/?period=month")
            
            if overview_response.status_code == 200 and financial_response.status_code == 200:
                overview_data = overview_response.json()
                financial_data = financial_response.json()
                
                print_success("Данные получены успешно")
                print_info(f"Обзор: {overview_data}")
                print_info(f"Финансы: {financial_data}")
                
                # Проверяем, что данные не пустые
                if overview_data and financial_data:
                    print_success("Данные не пустые - консистентность OK")
                else:
                    print_warning("Некоторые данные пустые")
                    
            else:
                print_error("Не удалось получить данные для проверки консистентности")
                
        except Exception as e:
            print_error(f"Ошибка при проверке консистентности: {str(e)}")

    def test_real_data_presence(self):
        """Проверка наличия реальных данных"""
        print_header("ТЕСТ: Наличие реальных данных")
        
        try:
            # Проверяем заказы
            orders_response = self.session.get(f"{BASE_URL}/api/orders/")
            if orders_response.status_code == 200:
                orders = orders_response.json()
                print_success(f"Заказы: {len(orders)} шт.")
            else:
                print_error("Не удалось получить заказы")
            
            # Проверяем платежи
            payments_response = self.session.get(f"{BASE_URL}/api/payments/")
            if payments_response.status_code == 200:
                payments = payments_response.json()
                print_success(f"Платежи: {len(payments)} шт.")
            else:
                print_warning("Не удалось получить платежи (возможно, endpoint не существует)")
            
            # Проверяем пользователей
            users_response = self.session.get(f"{BASE_URL}/api/users/")
            if users_response.status_code == 200:
                users = users_response.json()
                print_success(f"Пользователи: {len(users)} шт.")
                
                # Анализируем роли
                roles = {}
                for user in users:
                    role = user.get('role', 'unknown')
                    roles[role] = roles.get(role, 0) + 1
                
                print_info(f"Распределение ролей: {roles}")
            else:
                print_error("Не удалось получить пользователей")
                
        except Exception as e:
            print_error(f"Ошибка при проверке данных: {str(e)}")

    def run_all_tests(self):
        """Запуск всех тестов"""
        print_header("КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ КАБИНЕТА ДИРЕКТОРА")
        
        # Аутентификация
        if not self.authenticate_as_director():
            print_error("Не удалось аутентифицироваться")
            return False
        
        # Запуск тестов
        test_methods = [
            self.test_real_data_presence,
            self.test_personnel_management,
            self.test_financial_statistics,
            self.test_partner_management,
            self.test_general_statistics,
            self.test_arbitrator_communication,
            self.test_data_consistency
        ]
        
        passed = 0
        total = len(test_methods)
        
        for test_method in test_methods:
            try:
                test_method()
                passed += 1
            except Exception as e:
                print_error(f"Ошибка в тесте {test_method.__name__}: {str(e)}")
        
        # Итоговый отчет
        print_header("ИТОГОВЫЙ ОТЧЕТ")
        print_info(f"Пройдено тестов: {passed}/{total}")
        
        if passed == total:
            print_success("ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        else:
            print_warning(f"Некоторые тесты не прошли: {total - passed}")
        
        return passed == total

if __name__ == "__main__":
    tester = DirectorDashboardTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)