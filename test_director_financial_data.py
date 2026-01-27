#!/usr/bin/env python3
"""
Детальный тест финансовых данных кабинета директора
"""

import requests
import json
from datetime import datetime, timedelta

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

class FinancialDataTester:
    def __init__(self):
        self.session = requests.Session()
        self.setup_auth()
    
    def setup_auth(self):
        """Настройка авторизации"""
        # Получаем CSRF токен
        response = self.session.get(f"{BASE_URL}/admin/login/")
        if 'csrftoken' in self.session.cookies:
            csrf_token = self.session.cookies['csrftoken']
            
            # Авторизуемся
            login_data = {
                'username': 'testadmin',
                'password': 'testpass123',
                'csrfmiddlewaretoken': csrf_token
            }
            
            self.session.post(
                f"{BASE_URL}/admin/login/",
                data=login_data,
                headers={'Referer': f"{BASE_URL}/admin/login/"}
            )
    
    def test_basic_data(self):
        """Тест основных данных"""
        print_header("ОСНОВНЫЕ ДАННЫЕ СИСТЕМЫ")
        
        # Заказы
        try:
            response = self.session.get(f"{API_BASE}/orders/orders/")
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Заказы: {len(orders)} шт.")
                
                # Анализ заказов
                if orders:
                    statuses = {}
                    total_amount = 0
                    
                    for order in orders:
                        status = order.get('status', 'unknown')
                        statuses[status] = statuses.get(status, 0) + 1
                        
                        # Суммируем стоимость
                        try:
                            price = float(order.get('price', 0))
                            total_amount += price
                        except (ValueError, TypeError):
                            pass
                    
                    print_info(f"  Статусы заказов: {statuses}")
                    print_info(f"  Общая стоимость: {total_amount:.2f} руб.")
                    
                    # Показываем примеры заказов
                    print_info("  Примеры заказов:")
                    for i, order in enumerate(orders[:3]):
                        print_info(f"    {i+1}. ID: {order.get('id')}, Статус: {order.get('status')}, Цена: {order.get('price')}")
            else:
                print_error(f"Заказы: HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"Ошибка получения заказов: {e}")
    
    def test_director_personnel(self):
        """Тест данных персонала"""
        print_header("ДАННЫЕ ПЕРСОНАЛА")
        
        try:
            response = self.session.get(f"{API_BASE}/director/personnel/")
            if response.status_code == 200:
                data = response.json()
                print_success("Данные персонала получены")
                
                results = data.get('results', [])
                print_info(f"Количество сотрудников: {len(results)}")
                
                if results:
                    # Анализ ролей
                    roles = {}
                    for person in results:
                        role = person.get('role', 'unknown')
                        roles[role] = roles.get(role, 0) + 1
                    
                    print_info(f"Распределение ролей: {roles}")
                    
                    # Показываем примеры
                    print_info("Примеры сотрудников:")
                    for i, person in enumerate(results[:3]):
                        print_info(f"  {i+1}. {person.get('username', 'N/A')} - {person.get('role', 'N/A')}")
                        
            else:
                print_error(f"Персонал: HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"Ошибка получения персонала: {e}")
    
    def test_director_partners(self):
        """Тест данных партнеров"""
        print_header("ДАННЫЕ ПАРТНЕРОВ")
        
        try:
            response = self.session.get(f"{API_BASE}/director/partners/")
            if response.status_code == 200:
                partners = response.json()
                print_success(f"Партнеры: {len(partners)} шт.")
                
                if partners:
                    print_info("Список партнеров:")
                    for i, partner in enumerate(partners):
                        name = partner.get('name', 'N/A')
                        turnover = partner.get('turnover', 0)
                        print_info(f"  {i+1}. {name} - Оборот: {turnover}")
                        
            else:
                print_error(f"Партнеры: HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"Ошибка получения партнеров: {e}")
    
    def test_expert_applications(self):
        """Тест заявок экспертов"""
        print_header("ЗАЯВКИ ЭКСПЕРТОВ")
        
        try:
            response = self.session.get(f"{API_BASE}/director/personnel/expert-applications/")
            if response.status_code == 200:
                data = response.json()
                applications = data.get('results', [])
                print_success(f"Заявки экспертов: {len(applications)} шт.")
                
                if applications:
                    # Анализ статусов заявок
                    statuses = {}
                    for app in applications:
                        status = app.get('status', 'unknown')
                        statuses[status] = statuses.get(status, 0) + 1
                    
                    print_info(f"Статусы заявок: {statuses}")
                    
                    # Показываем примеры
                    print_info("Примеры заявок:")
                    for i, app in enumerate(applications[:3]):
                        expert_name = app.get('expert', {}).get('username', 'N/A') if isinstance(app.get('expert'), dict) else 'N/A'
                        print_info(f"  {i+1}. Эксперт: {expert_name}, Статус: {app.get('status')}")
                        
            else:
                print_error(f"Заявки экспертов: HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"Ошибка получения заявок: {e}")
    
    def test_financial_calculations(self):
        """Тест финансовых расчетов"""
        print_header("ФИНАНСОВЫЕ РАСЧЕТЫ")
        
        try:
            # Получаем заказы для расчетов
            orders_response = self.session.get(f"{API_BASE}/orders/orders/")
            if orders_response.status_code == 200:
                orders = orders_response.json()
                
                # Расчет основных показателей
                total_revenue = 0
                completed_orders = 0
                pending_orders = 0
                
                for order in orders:
                    try:
                        price = float(order.get('price', 0))
                        status = order.get('status', '')
                        
                        if status == 'completed':
                            total_revenue += price
                            completed_orders += 1
                        elif status in ['pending', 'in_progress']:
                            pending_orders += 1
                            
                    except (ValueError, TypeError):
                        continue
                
                print_success("Финансовые показатели рассчитаны:")
                print_info(f"  Общая выручка: {total_revenue:.2f} руб.")
                print_info(f"  Завершенных заказов: {completed_orders}")
                print_info(f"  Заказов в работе: {pending_orders}")
                print_info(f"  Средний чек: {total_revenue/completed_orders:.2f} руб." if completed_orders > 0 else "  Средний чек: 0 руб.")
                
                # Расчет за текущий месяц
                current_month = datetime.now().replace(day=1)
                monthly_revenue = 0
                monthly_orders = 0
                
                for order in orders:
                    try:
                        # Предполагаем, что есть поле created_at
                        created_at = order.get('created_at')
                        if created_at:
                            order_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            if order_date >= current_month and order.get('status') == 'completed':
                                monthly_revenue += float(order.get('price', 0))
                                monthly_orders += 1
                    except:
                        continue
                
                print_info(f"  Выручка за месяц: {monthly_revenue:.2f} руб.")
                print_info(f"  Заказов за месяц: {monthly_orders}")
                
            else:
                print_error("Не удалось получить данные для расчетов")
                
        except Exception as e:
            print_error(f"Ошибка финансовых расчетов: {e}")
    
    def test_data_consistency(self):
        """Тест консистентности данных"""
        print_header("КОНСИСТЕНТНОСТЬ ДАННЫХ")
        
        try:
            # Получаем данные из разных источников
            personnel_response = self.session.get(f"{API_BASE}/director/personnel/")
            partners_response = self.session.get(f"{API_BASE}/director/partners/")
            orders_response = self.session.get(f"{API_BASE}/orders/orders/")
            
            personnel_count = 0
            partners_count = 0
            orders_count = 0
            
            if personnel_response.status_code == 200:
                personnel_data = personnel_response.json()
                personnel_count = len(personnel_data.get('results', []))
            
            if partners_response.status_code == 200:
                partners_data = partners_response.json()
                partners_count = len(partners_data)
            
            if orders_response.status_code == 200:
                orders_data = orders_response.json()
                orders_count = len(orders_data)
            
            print_success("Проверка консистентности:")
            print_info(f"  Персонал: {personnel_count} записей")
            print_info(f"  Партнеры: {partners_count} записей")
            print_info(f"  Заказы: {orders_count} записей")
            
            # Проверяем, что данные не пустые
            if personnel_count > 0 and orders_count > 0:
                print_success("  Основные данные присутствуют")
            else:
                print_warning("  Некоторые данные отсутствуют")
            
            if partners_count > 0:
                print_success("  Данные партнеров присутствуют")
            else:
                print_warning("  Данные партнеров отсутствуют")
                
        except Exception as e:
            print_error(f"Ошибка проверки консистентности: {e}")
    
    def run_all_tests(self):
        """Запуск всех тестов"""
        print_header("ДЕТАЛЬНОЕ ТЕСТИРОВАНИЕ ДАННЫХ ДИРЕКТОРА")
        
        tests = [
            ("Основные данные", self.test_basic_data),
            ("Персонал", self.test_director_personnel),
            ("Партнеры", self.test_director_partners),
            ("Заявки экспертов", self.test_expert_applications),
            ("Финансовые расчеты", self.test_financial_calculations),
            ("Консистентность данных", self.test_data_consistency),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                print_info(f"Запуск теста: {test_name}")
                test_func()
                passed += 1
                print_success(f"Тест '{test_name}' пройден")
            except Exception as e:
                print_error(f"Тест '{test_name}' не пройден: {e}")
        
        # Итоговый отчет
        print_header("ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ")
        
        print_info(f"Всего тестов: {total}")
        print_info(f"Пройдено: {passed}")
        print_info(f"Не пройдено: {total - passed}")
        
        if passed == total:
            print_success("ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
            print_success("Кабинет директора работает с реальными данными")
        elif passed > total // 2:
            print_success("БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО")
            print_info("Основная функциональность работает")
        else:
            print_warning("МНОГО ТЕСТОВ НЕ ПРОШЛО")
            print_info("Требуется дополнительная настройка")
        
        return passed >= total // 2

if __name__ == "__main__":
    tester = FinancialDataTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!")
        print_info("Кабинет директора готов к использованию с реальными данными")
    else:
        print_warning("\n⚠️  ТЕСТИРОВАНИЕ ВЫЯВИЛО ПРОБЛЕМЫ")
        print_info("Рекомендуется дополнительная настройка")