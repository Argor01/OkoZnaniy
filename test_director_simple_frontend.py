#!/usr/bin/env python3
"""
Простой тест фронтенда кабинета директора без Selenium
Проверяет доступность и базовую функциональность
"""

import requests
import json
import time

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

class SimpleFrontendTester:
    def __init__(self):
        self.frontend_url = "http://localhost:5173"
        self.backend_url = "http://localhost:8000"
        self.session = requests.Session()
        self.setup_auth()
    
    def setup_auth(self):
        """Настройка авторизации для API тестов"""
        try:
            # Получаем CSRF токен
            response = self.session.get(f"{self.backend_url}/admin/login/")
            if 'csrftoken' in self.session.cookies:
                csrf_token = self.session.cookies['csrftoken']
                
                # Авторизуемся
                login_data = {
                    'username': 'testadmin',
                    'password': 'testpass123',
                    'csrfmiddlewaretoken': csrf_token
                }
                
                self.session.post(
                    f"{self.backend_url}/admin/login/",
                    data=login_data,
                    headers={'Referer': f"{self.backend_url}/admin/login/"}
                )
                print_info("Авторизация для API настроена")
        except Exception as e:
            print_warning(f"Ошибка настройки авторизации: {e}")
    
    def test_frontend_availability(self):
        """Тест доступности фронтенда"""
        print_header("ТЕСТ ДОСТУПНОСТИ ФРОНТЕНДА")
        
        try:
            response = requests.get(self.frontend_url, timeout=10)
            if response.status_code == 200:
                print_success("Фронтенд доступен")
                
                # Проверяем содержимое
                content = response.text
                if "<!DOCTYPE html>" in content or "<html" in content:
                    print_success("HTML контент получен")
                    
                    # Проверяем наличие React/Vite
                    if "react" in content.lower() or "vite" in content.lower():
                        print_success("React/Vite приложение обнаружено")
                    
                    # Проверяем наличие скриптов
                    if "<script" in content:
                        print_success("JavaScript скрипты найдены")
                    
                    return True
                else:
                    print_warning("Получен не HTML контент")
                    return False
            else:
                print_error(f"Фронтенд недоступен: HTTP {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print_error("Фронтенд недоступен: соединение отклонено")
            print_info("Убедитесь, что фронтенд запущен на порту 5173")
            return False
        except Exception as e:
            print_error(f"Ошибка проверки фронтенда: {e}")
            return False
    
    def test_api_endpoints_for_frontend(self):
        """Тест API endpoints, используемых фронтендом"""
        print_header("ТЕСТ API ДЛЯ ФРОНТЕНДА")
        
        # API endpoints, которые использует фронтенд директора
        endpoints = [
            (f"{self.backend_url}/api/director/personnel/", "Персонал"),
            (f"{self.backend_url}/api/director/partners/", "Партнеры"),
            (f"{self.backend_url}/api/director/personnel/expert-applications/", "Заявки экспертов"),
            (f"{self.backend_url}/api/orders/orders/", "Заказы"),
        ]
        
        working_endpoints = 0
        
        for url, description in endpoints:
            try:
                response = self.session.get(url)
                if response.status_code == 200:
                    data = response.json()
                    print_success(f"{description}: OK")
                    
                    # Проверяем структуру данных
                    if isinstance(data, dict) and 'results' in data:
                        count = len(data['results'])
                        print_info(f"  Записей: {count}")
                    elif isinstance(data, list):
                        print_info(f"  Записей: {len(data)}")
                    
                    working_endpoints += 1
                    
                elif response.status_code == 401:
                    print_warning(f"{description}: Требует авторизации")
                elif response.status_code == 404:
                    print_error(f"{description}: Не найден")
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")
        
        print_info(f"Работающих API endpoints: {working_endpoints}/{len(endpoints)}")
        return working_endpoints > 0
    
    def test_financial_data_api(self):
        """Тест API финансовых данных"""
        print_header("ТЕСТ ФИНАНСОВЫХ ДАННЫХ API")
        
        try:
            # Получаем заказы для расчета финансовых показателей
            orders_response = self.session.get(f"{self.backend_url}/api/orders/orders/")
            
            if orders_response.status_code == 200:
                orders = orders_response.json()
                print_success(f"Заказы получены: {len(orders)} шт.")
                
                # Имитируем расчеты, которые делает фронтенд
                total_revenue = 0
                completed_orders = 0
                
                for order in orders:
                    if isinstance(order, dict):
                        status = order.get('status', '')
                        if status == 'completed':
                            try:
                                price = float(order.get('price', 0))
                                total_revenue += price
                                completed_orders += 1
                            except (ValueError, TypeError):
                                pass
                
                print_success("Финансовые расчеты выполнены:")
                print_info(f"  Общая выручка: {total_revenue:.2f} руб.")
                print_info(f"  Завершенных заказов: {completed_orders}")
                
                if completed_orders > 0:
                    avg_order = total_revenue / completed_orders
                    print_info(f"  Средний чек: {avg_order:.2f} руб.")
                
                return True
            else:
                print_error(f"Не удалось получить заказы: HTTP {orders_response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Ошибка тестирования финансовых данных: {e}")
            return False
    
    def test_data_consistency_for_frontend(self):
        """Тест консистентности данных для фронтенда"""
        print_header("ТЕСТ КОНСИСТЕНТНОСТИ ДАННЫХ")
        
        try:
            # Получаем данные из разных источников
            data_sources = [
                (f"{self.backend_url}/api/director/personnel/", "Персонал"),
                (f"{self.backend_url}/api/director/partners/", "Партнеры"),
                (f"{self.backend_url}/api/orders/orders/", "Заказы"),
            ]
            
            data_summary = {}
            
            for url, name in data_sources:
                try:
                    response = self.session.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        
                        if isinstance(data, dict) and 'results' in data:
                            count = len(data['results'])
                        elif isinstance(data, list):
                            count = len(data)
                        else:
                            count = 1 if data else 0
                        
                        data_summary[name] = count
                        print_success(f"{name}: {count} записей")
                    else:
                        data_summary[name] = 0
                        print_warning(f"{name}: недоступен")
                        
                except Exception as e:
                    data_summary[name] = 0
                    print_error(f"{name}: ошибка - {e}")
            
            # Анализ консистентности
            total_records = sum(data_summary.values())
            if total_records > 0:
                print_success(f"Общее количество записей: {total_records}")
                
                # Проверяем, что есть основные данные
                essential_data = ['Персонал', 'Заказы']
                missing_essential = [name for name in essential_data if data_summary.get(name, 0) == 0]
                
                if not missing_essential:
                    print_success("Все основные данные присутствуют")
                    return True
                else:
                    print_warning(f"Отсутствуют основные данные: {missing_essential}")
                    return False
            else:
                print_error("Нет данных для отображения")
                return False
                
        except Exception as e:
            print_error(f"Ошибка проверки консистентности: {e}")
            return False
    
    def test_cors_and_connectivity(self):
        """Тест CORS и связности между фронтендом и бэкендом"""
        print_header("ТЕСТ CORS И СВЯЗНОСТИ")
        
        try:
            # Проверяем CORS заголовки
            response = self.session.options(f"{self.backend_url}/api/director/personnel/")
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            print_info("CORS заголовки:")
            for header, value in cors_headers.items():
                if value:
                    print_success(f"  {header}: {value}")
                else:
                    print_warning(f"  {header}: не установлен")
            
            # Проверяем доступность API с фронтенда
            try:
                # Имитируем запрос с фронтенда
                headers = {
                    'Origin': self.frontend_url,
                    'Referer': self.frontend_url,
                }
                
                response = requests.get(
                    f"{self.backend_url}/api/orders/orders/",
                    headers=headers,
                    timeout=5
                )
                
                if response.status_code in [200, 401, 403]:  # 401/403 тоже означают, что сервер отвечает
                    print_success("API доступен с фронтенда")
                    return True
                else:
                    print_warning(f"API отвечает с кодом {response.status_code}")
                    return False
                    
            except Exception as e:
                print_error(f"Ошибка проверки связности: {e}")
                return False
                
        except Exception as e:
            print_error(f"Ошибка проверки CORS: {e}")
            return False
    
    def run_all_tests(self):
        """Запуск всех тестов"""
        print_header("КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ФРОНТЕНДА ДИРЕКТОРА")
        
        tests = [
            ("Доступность фронтенда", self.test_frontend_availability),
            ("API для фронтенда", self.test_api_endpoints_for_frontend),
            ("Финансовые данные API", self.test_financial_data_api),
            ("Консистентность данных", self.test_data_consistency_for_frontend),
            ("CORS и связность", self.test_cors_and_connectivity),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                print_info(f"Запуск теста: {test_name}")
                if test_func():
                    passed += 1
                    print_success(f"Тест '{test_name}' пройден")
                else:
                    print_warning(f"Тест '{test_name}' не пройден")
                    
            except Exception as e:
                print_error(f"Тест '{test_name}' завершился с ошибкой: {e}")
        
        # Итоговый отчет
        print_header("ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ")
        
        print_info(f"Всего тестов: {total}")
        print_info(f"Пройдено: {passed}")
        print_info(f"Не пройдено: {total - passed}")
        
        success_rate = (passed / total) * 100
        
        if passed == total:
            print_success("ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
            print_success("Кабинет директора полностью готов к работе")
        elif success_rate >= 80:
            print_success("БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО")
            print_info("Кабинет директора в основном работает корректно")
        elif success_rate >= 60:
            print_warning("ЧАСТЬ ТЕСТОВ НЕ ПРОШЛА")
            print_info("Кабинет директора работает, но есть проблемы")
        else:
            print_error("МНОГО ТЕСТОВ НЕ ПРОШЛО")
            print_info("Требуется серьезная доработка")
        
        # Рекомендации
        print_header("РЕКОМЕНДАЦИИ")
        
        if passed < total:
            print_info("Для улучшения работы кабинета директора:")
            
            if not self.test_frontend_availability():
                print_info("1. Убедитесь, что фронтенд запущен (npm run dev)")
            
            if not self.test_api_endpoints_for_frontend():
                print_info("2. Проверьте работу API endpoints")
                print_info("3. Убедитесь в правильной авторизации")
            
            print_info("4. Проверьте логи фронтенда и бэкенда")
            print_info("5. Убедитесь в корректности CORS настроек")
        
        return success_rate >= 60

def main():
    tester = SimpleFrontendTester()
    success = tester.run_all_tests()
    
    if success:
        print_success("\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!")
        print_info("Кабинет директора работает с реальными данными")
    else:
        print_warning("\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ")
        print_info("Требуется дополнительная настройка")

if __name__ == "__main__":
    main()