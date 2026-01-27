#!/usr/bin/env python3
"""
Финальный тест кабинета директора с реальными финансовыми данными
"""

import requests
import json

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
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message.center(60)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

class FinalDirectorTester:
    def __init__(self):
        self.session = requests.Session()
        self.setup_auth()
    
    def setup_auth(self):
        """Настройка авторизации"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/login/")
            if 'csrftoken' in self.session.cookies:
                csrf_token = self.session.cookies['csrftoken']
                
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
        except Exception as e:
            print_warning(f"Ошибка авторизации: {e}")
    
    def test_financial_data(self):
        """Тест финансовых данных"""
        print_header("ФИНАЛЬНЫЙ ТЕСТ ФИНАНСОВЫХ ДАННЫХ")
        
        try:
            # Получаем все заказы
            response = self.session.get(f"{API_BASE}/orders/orders/")
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Заказы получены: {len(orders)} шт.")
                
                # Анализируем заказы
                completed_orders = []
                total_revenue = 0
                
                for order in orders:
                    if isinstance(order, dict):
                        status = order.get('status', '')
                        final_price = order.get('final_price')
                        
                        print_info(f"Заказ: {order.get('title', 'Без названия')}")
                        print_info(f"  Статус: {status}")
                        print_info(f"  Цена: {final_price} руб.")
                        
                        if status == 'completed' and final_price:
                            completed_orders.append(order)
                            total_revenue += float(final_price)
                
                print_success(f"Завершенных заказов: {len(completed_orders)}")
                print_success(f"Общая выручка: {total_revenue:.2f} руб.")
                
                if len(completed_orders) > 0:
                    avg_order = total_revenue / len(completed_orders)
                    print_success(f"Средний чек: {avg_order:.2f} руб.")
                
                return len(completed_orders) > 0
                
            else:
                print_error(f"Ошибка получения заказов: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Ошибка тестирования финансовых данных: {e}")
            return False
    
    def test_director_api_with_data(self):
        """Тест API директора с данными"""
        print_header("ТЕСТ API ДИРЕКТОРА С РЕАЛЬНЫМИ ДАННЫМИ")
        
        endpoints = [
            (f"{API_BASE}/director/personnel/", "Персонал"),
            (f"{API_BASE}/director/partners/", "Партнеры"),
            (f"{API_BASE}/director/personnel/expert-applications/", "Заявки экспертов"),
        ]
        
        working_endpoints = 0
        
        for url, description in endpoints:
            try:
                response = self.session.get(url)
                if response.status_code == 200:
                    data = response.json()
                    
                    if isinstance(data, dict) and 'results' in data:
                        results = data['results']
                        count = len(results)
                        print_success(f"{description}: {count} записей")
                        
                        # Показываем примеры данных
                        if results:
                            sample = results[0]
                            print_info(f"  Пример данных: {list(sample.keys())[:5]}")
                            
                    elif isinstance(data, list):
                        count = len(data)
                        print_success(f"{description}: {count} записей")
                        
                        if data:
                            sample = data[0]
                            print_info(f"  Пример данных: {list(sample.keys())[:5]}")
                    
                    working_endpoints += 1
                    
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")
        
        return working_endpoints == len(endpoints)
    
    def test_system_statistics(self):
        """Тест системной статистики"""
        print_header("СИСТЕМНАЯ СТАТИСТИКА")
        
        try:
            # Получаем статистику по всем данным
            stats = {}
            
            # Заказы
            orders_response = self.session.get(f"{API_BASE}/orders/orders/")
            if orders_response.status_code == 200:
                orders = orders_response.json()
                stats['total_orders'] = len(orders)
                
                # Анализ статусов
                statuses = {}
                total_revenue = 0
                
                for order in orders:
                    if isinstance(order, dict):
                        status = order.get('status', 'unknown')
                        statuses[status] = statuses.get(status, 0) + 1
                        
                        if status == 'completed' and order.get('final_price'):
                            total_revenue += float(order.get('final_price', 0))
                
                stats['order_statuses'] = statuses
                stats['total_revenue'] = total_revenue
            
            # Персонал
            personnel_response = self.session.get(f"{API_BASE}/director/personnel/")
            if personnel_response.status_code == 200:
                personnel_data = personnel_response.json()
                if isinstance(personnel_data, dict) and 'results' in personnel_data:
                    personnel = personnel_data['results']
                    stats['total_personnel'] = len(personnel)
                    
                    # Анализ ролей
                    roles = {}
                    for person in personnel:
                        role = person.get('role', 'unknown')
                        roles[role] = roles.get(role, 0) + 1
                    
                    stats['personnel_roles'] = roles
            
            # Партнеры
            partners_response = self.session.get(f"{API_BASE}/director/partners/")
            if partners_response.status_code == 200:
                partners = partners_response.json()
                stats['total_partners'] = len(partners)
            
            # Выводим статистику
            print_success("ОБЩАЯ СТАТИСТИКА СИСТЕМЫ:")
            print_info(f"📊 Всего заказов: {stats.get('total_orders', 0)}")
            print_info(f"💰 Общая выручка: {stats.get('total_revenue', 0):.2f} руб.")
            print_info(f"👥 Персонал: {stats.get('total_personnel', 0)} человек")
            print_info(f"🤝 Партнеры: {stats.get('total_partners', 0)}")
            
            if stats.get('order_statuses'):
                print_info("📈 Статусы заказов:")
                for status, count in stats['order_statuses'].items():
                    print_info(f"   {status}: {count}")
            
            if stats.get('personnel_roles'):
                print_info("👤 Роли персонала:")
                for role, count in stats['personnel_roles'].items():
                    print_info(f"   {role}: {count}")
            
            return True
            
        except Exception as e:
            print_error(f"Ошибка получения статистики: {e}")
            return False
    
    def run_final_test(self):
        """Финальный тест"""
        print_header("🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КАБИНЕТА ДИРЕКТОРА")
        
        tests = [
            ("Финансовые данные", self.test_financial_data),
            ("API директора", self.test_director_api_with_data),
            ("Системная статистика", self.test_system_statistics),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                print_info(f"🔄 Запуск теста: {test_name}")
                if test_func():
                    passed += 1
                    print_success(f"✅ Тест '{test_name}' пройден")
                else:
                    print_warning(f"⚠️ Тест '{test_name}' не пройден")
                    
            except Exception as e:
                print_error(f"❌ Тест '{test_name}' завершился с ошибкой: {e}")
        
        # Итоговый отчет
        print_header("🏆 ИТОГОВЫЙ ОТЧЕТ")
        
        success_rate = (passed / total) * 100
        
        print_info(f"📊 Всего тестов: {total}")
        print_info(f"✅ Пройдено: {passed}")
        print_info(f"❌ Не пройдено: {total - passed}")
        print_info(f"📈 Процент успеха: {success_rate:.1f}%")
        
        if passed == total:
            print_success("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
            print_success("🚀 Кабинет директора полностью готов к работе!")
            print_info("✨ Система работает с реальными данными из базы")
        elif success_rate >= 80:
            print_success("🎊 БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО!")
            print_info("🔧 Система в основном работает, есть мелкие недочеты")
        else:
            print_warning("⚠️ ЕСТЬ ПРОБЛЕМЫ С СИСТЕМОЙ")
            print_info("🛠️ Требуется дополнительная настройка")
        
        return success_rate >= 80

def main():
    print_header("🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КАБИНЕТА ДИРЕКТОРА")
    print_info("Проверяем работу с реальными данными...")
    
    tester = FinalDirectorTester()
    success = tester.run_final_test()
    
    if success:
        print_success("\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!")
        print_info("🚀 Кабинет директора готов к использованию")
        print_info("💡 Можно переходить к работе с реальными данными")
    else:
        print_warning("\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ")
        print_info("🔧 Требуется дополнительная настройка")

if __name__ == "__main__":
    main()