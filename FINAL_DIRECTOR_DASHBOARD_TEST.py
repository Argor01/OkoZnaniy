#!/usr/bin/env python3
"""
ФИНАЛЬНЫЙ ТЕСТ КАБИНЕТА ДИРЕКТОРА
Проверяет все функции с реальными данными
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
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message.center(70)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.ENDC}\n")

class FinalDirectorTest:
    def __init__(self):
        self.session = requests.Session()
        self.setup_auth()
        self.test_results = {}
    
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
                print_info("Авторизация настроена")
        except Exception as e:
            print_warning(f"Ошибка авторизации: {e}")
    
    def get_all_orders(self):
        """Получение всех заказов с пагинацией"""
        all_orders = []
        url = f"{API_BASE}/orders/orders/"
        
        while url:
            try:
                response = self.session.get(url)
                if response.status_code == 200:
                    data = response.json()
                    
                    if isinstance(data, dict) and 'results' in data:
                        all_orders.extend(data['results'])
                        url = data.get('next')  # Следующая страница
                    else:
                        break
                else:
                    print_error(f"Ошибка получения заказов: HTTP {response.status_code}")
                    break
                    
            except Exception as e:
                print_error(f"Ошибка запроса заказов: {e}")
                break
        
        return all_orders
    
    def test_financial_data_comprehensive(self):
        """Комплексный тест финансовых данных"""
        print_header("🏦 КОМПЛЕКСНЫЙ ТЕСТ ФИНАНСОВЫХ ДАННЫХ")
        
        try:
            # Получаем все заказы
            all_orders = self.get_all_orders()
            print_success(f"Получено заказов: {len(all_orders)}")
            
            # Анализируем заказы
            stats = {
                'total_orders': len(all_orders),
                'completed_orders': 0,
                'in_progress_orders': 0,
                'new_orders': 0,
                'cancelled_orders': 0,
                'total_revenue': 0,
                'average_order_value': 0,
                'orders_by_status': {}
            }
            
            for order in all_orders:
                if not isinstance(order, dict):
                    continue
                
                status = order.get('status', 'unknown')
                final_price = order.get('final_price')
                
                # Подсчет по статусам
                stats['orders_by_status'][status] = stats['orders_by_status'].get(status, 0) + 1
                
                if status == 'completed':
                    stats['completed_orders'] += 1
                    if final_price:
                        stats['total_revenue'] += float(final_price)
                elif status == 'in_progress':
                    stats['in_progress_orders'] += 1
                elif status == 'new':
                    stats['new_orders'] += 1
                elif status in ['cancelled', 'canceled']:
                    stats['cancelled_orders'] += 1
            
            # Рассчитываем средний чек
            if stats['completed_orders'] > 0:
                stats['average_order_value'] = stats['total_revenue'] / stats['completed_orders']
            
            # Выводим статистику
            print_success("📊 ФИНАНСОВАЯ СТАТИСТИКА:")
            print_info(f"   Всего заказов: {stats['total_orders']}")
            print_info(f"   Завершенных заказов: {stats['completed_orders']}")
            print_info(f"   Заказов в работе: {stats['in_progress_orders']}")
            print_info(f"   Новых заказов: {stats['new_orders']}")
            print_info(f"   Отмененных заказов: {stats['cancelled_orders']}")
            print_info(f"   💰 Общая выручка: {stats['total_revenue']:.2f} руб.")
            print_info(f"   💳 Средний чек: {stats['average_order_value']:.2f} руб.")
            
            print_info("📈 Распределение по статусам:")
            for status, count in stats['orders_by_status'].items():
                percentage = (count / stats['total_orders']) * 100 if stats['total_orders'] > 0 else 0
                print_info(f"   {status}: {count} ({percentage:.1f}%)")
            
            # Показываем примеры завершенных заказов
            completed_orders = [o for o in all_orders if o.get('status') == 'completed' and o.get('final_price')]
            if completed_orders:
                print_info("💼 Примеры завершенных заказов:")
                for i, order in enumerate(completed_orders[:5]):
                    title = order.get('title', 'Без названия')
                    price = order.get('final_price', 0)
                    print_info(f"   {i+1}. {title} - {price} руб.")
            
            self.test_results['financial_data'] = {
                'passed': stats['total_orders'] > 0,
                'stats': stats
            }
            
            return stats['total_orders'] > 0
            
        except Exception as e:
            print_error(f"Ошибка тестирования финансовых данных: {e}")
            self.test_results['financial_data'] = {'passed': False, 'error': str(e)}
            return False
    
    def test_director_api_comprehensive(self):
        """Комплексный тест API директора"""
        print_header("👔 КОМПЛЕКСНЫЙ ТЕСТ API ДИРЕКТОРА")
        
        api_tests = [
            (f"{API_BASE}/director/personnel/", "Персонал"),
            (f"{API_BASE}/director/partners/", "Партнеры"),
            (f"{API_BASE}/director/personnel/expert-applications/", "Заявки экспертов"),
        ]
        
        results = {}
        
        for url, name in api_tests:
            try:
                response = self.session.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if isinstance(data, dict) and 'results' in data:
                        count = len(data['results'])
                        results[name] = {'count': count, 'status': 'success'}
                        print_success(f"{name}: {count} записей")
                        
                        # Показываем примеры данных
                        if data['results']:
                            sample = data['results'][0]
                            print_info(f"   Поля: {list(sample.keys())[:5]}...")
                            
                    elif isinstance(data, list):
                        count = len(data)
                        results[name] = {'count': count, 'status': 'success'}
                        print_success(f"{name}: {count} записей")
                        
                        if data:
                            sample = data[0]
                            print_info(f"   Поля: {list(sample.keys())[:5]}...")
                    else:
                        results[name] = {'count': 0, 'status': 'unknown_format'}
                        print_warning(f"{name}: Неизвестный формат данных")
                        
                elif response.status_code == 401:
                    results[name] = {'count': 0, 'status': 'unauthorized'}
                    print_error(f"{name}: Требуется авторизация")
                elif response.status_code == 404:
                    results[name] = {'count': 0, 'status': 'not_found'}
                    print_error(f"{name}: Endpoint не найден")
                else:
                    results[name] = {'count': 0, 'status': f'http_{response.status_code}'}
                    print_error(f"{name}: HTTP {response.status_code}")
                    
            except Exception as e:
                results[name] = {'count': 0, 'status': 'error', 'error': str(e)}
                print_error(f"{name}: {str(e)}")
        
        # Подсчитываем успешные тесты
        successful_tests = sum(1 for r in results.values() if r['status'] == 'success')
        total_tests = len(results)
        
        print_info(f"📊 Результат API тестов: {successful_tests}/{total_tests}")
        
        self.test_results['director_api'] = {
            'passed': successful_tests > 0,
            'results': results,
            'success_rate': (successful_tests / total_tests) * 100
        }
        
        return successful_tests > 0
    
    def test_frontend_connectivity(self):
        """Тест связности с фронтендом"""
        print_header("🌐 ТЕСТ СВЯЗНОСТИ С ФРОНТЕНДОМ")
        
        try:
            # Проверяем доступность фронтенда
            frontend_response = requests.get("http://localhost:5173", timeout=5)
            
            if frontend_response.status_code == 200:
                print_success("Фронтенд доступен")
                
                # Проверяем содержимое
                content = frontend_response.text
                if "react" in content.lower() or "vite" in content.lower():
                    print_success("React/Vite приложение обнаружено")
                
                # Проверяем API с заголовками фронтенда
                headers = {
                    'Origin': 'http://localhost:5173',
                    'Referer': 'http://localhost:5173',
                }
                
                api_response = self.session.get(f"{API_BASE}/orders/orders/", headers=headers)
                if api_response.status_code in [200, 401]:
                    print_success("API доступен с фронтенда")
                    
                    self.test_results['frontend_connectivity'] = {'passed': True}
                    return True
                else:
                    print_warning(f"API отвечает с кодом {api_response.status_code}")
                    self.test_results['frontend_connectivity'] = {'passed': False, 'api_status': api_response.status_code}
                    return False
            else:
                print_error(f"Фронтенд недоступен: HTTP {frontend_response.status_code}")
                self.test_results['frontend_connectivity'] = {'passed': False, 'frontend_status': frontend_response.status_code}
                return False
                
        except requests.exceptions.ConnectionError:
            print_error("Фронтенд недоступен: соединение отклонено")
            self.test_results['frontend_connectivity'] = {'passed': False, 'error': 'connection_refused'}
            return False
        except Exception as e:
            print_error(f"Ошибка тестирования связности: {e}")
            self.test_results['frontend_connectivity'] = {'passed': False, 'error': str(e)}
            return False
    
    def generate_final_report(self):
        """Генерация финального отчета"""
        print_header("📋 ФИНАЛЬНЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results.values() if r.get('passed', False))
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print_info(f"📊 Общая статистика:")
        print_info(f"   Всего тестов: {total_tests}")
        print_info(f"   Пройдено: {passed_tests}")
        print_info(f"   Не пройдено: {total_tests - passed_tests}")
        print_info(f"   Процент успеха: {success_rate:.1f}%")
        
        # Детальные результаты
        print_info("📝 Детальные результаты:")
        
        for test_name, result in self.test_results.items():
            status = "✅ ПРОЙДЕН" if result.get('passed') else "❌ НЕ ПРОЙДЕН"
            print_info(f"   {test_name}: {status}")
            
            if test_name == 'financial_data' and result.get('stats'):
                stats = result['stats']
                print_info(f"      Заказов: {stats['total_orders']}, Выручка: {stats['total_revenue']:.2f} руб.")
            
            if test_name == 'director_api' and result.get('success_rate'):
                print_info(f"      API успешность: {result['success_rate']:.1f}%")
        
        # Итоговая оценка
        if success_rate >= 90:
            print_success("🎉 ОТЛИЧНО! Кабинет директора полностью готов к работе!")
            status = "EXCELLENT"
        elif success_rate >= 70:
            print_success("✅ ХОРОШО! Кабинет директора в основном работает корректно")
            status = "GOOD"
        elif success_rate >= 50:
            print_warning("⚠️ УДОВЛЕТВОРИТЕЛЬНО. Есть проблемы, но основные функции работают")
            status = "SATISFACTORY"
        else:
            print_error("❌ НЕУДОВЛЕТВОРИТЕЛЬНО. Требуется серьезная доработка")
            status = "POOR"
        
        # Рекомендации
        print_header("💡 РЕКОМЕНДАЦИИ")
        
        if not self.test_results.get('financial_data', {}).get('passed'):
            print_info("🔧 Финансовые данные:")
            print_info("   - Проверить API заказов")
            print_info("   - Убедиться в корректности сериализации")
        
        if not self.test_results.get('director_api', {}).get('passed'):
            print_info("🔧 API директора:")
            print_info("   - Проверить авторизацию")
            print_info("   - Убедиться в правильности URL-ов")
        
        if not self.test_results.get('frontend_connectivity', {}).get('passed'):
            print_info("🔧 Фронтенд:")
            print_info("   - Запустить фронтенд (npm run dev)")
            print_info("   - Проверить CORS настройки")
        
        print_info("🚀 Для продакшена рекомендуется:")
        print_info("   - Настроить мониторинг")
        print_info("   - Добавить логирование")
        print_info("   - Оптимизировать производительность")
        
        return status, success_rate
    
    def run_comprehensive_test(self):
        """Запуск комплексного тестирования"""
        print_header("🎯 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ КАБИНЕТА ДИРЕКТОРА")
        print_info("Проверяем все аспекты работы с реальными данными...")
        
        # Запускаем тесты
        tests = [
            ("Финансовые данные", self.test_financial_data_comprehensive),
            ("API директора", self.test_director_api_comprehensive),
            ("Связность с фронтендом", self.test_frontend_connectivity),
        ]
        
        for test_name, test_func in tests:
            print_info(f"🔄 Запуск теста: {test_name}")
            try:
                test_func()
            except Exception as e:
                print_error(f"Критическая ошибка в тесте {test_name}: {e}")
                self.test_results[test_name.lower().replace(' ', '_')] = {'passed': False, 'error': str(e)}
        
        # Генерируем отчет
        status, success_rate = self.generate_final_report()
        
        return status, success_rate

def main():
    print_header("🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КАБИНЕТА ДИРЕКТОРА")
    print_info("Дата тестирования: " + datetime.now().strftime("%d.%m.%Y %H:%M:%S"))
    
    tester = FinalDirectorTest()
    status, success_rate = tester.run_comprehensive_test()
    
    # Финальное сообщение
    if status in ["EXCELLENT", "GOOD"]:
        print_success(f"\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО! ({success_rate:.1f}%)")
        print_info("🚀 Кабинет директора готов к использованию с реальными данными")
    else:
        print_warning(f"\n⚠️ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО С ЗАМЕЧАНИЯМИ ({success_rate:.1f}%)")
        print_info("🔧 Рекомендуется устранить выявленные проблемы")

if __name__ == "__main__":
    main()