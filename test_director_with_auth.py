#!/usr/bin/env python3
"""
Тест кабинета директора с авторизацией
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

class DirectorTester:
    def __init__(self):
        self.session = requests.Session()
        self.csrf_token = None
        
    def get_csrf_token(self):
        """Получение CSRF токена"""
        try:
            response = self.session.get(f"{BASE_URL}/admin/login/")
            if 'csrftoken' in self.session.cookies:
                self.csrf_token = self.session.cookies['csrftoken']
                print_success("CSRF токен получен")
                return True
        except Exception as e:
            print_error(f"Ошибка получения CSRF токена: {e}")
        return False
    
    def create_admin_user(self):
        """Создание админского пользователя через Django shell"""
        print_info("Создание админского пользователя...")
        
        # Команда для создания суперпользователя
        create_user_script = """
from django.contrib.auth import get_user_model
User = get_user_model()

# Удаляем существующего админа если есть
try:
    admin_user = User.objects.get(username='testadmin')
    admin_user.delete()
    print('Старый админ удален')
except User.DoesNotExist:
    pass

# Создаем нового админа
admin_user = User.objects.create_user(
    username='testadmin',
    email='admin@test.com',
    password='testpass123',
    is_staff=True,
    is_superuser=True
)
admin_user.role = 'admin'
admin_user.save()
print(f'Админ создан: {admin_user.username}')
"""
        
        # Записываем скрипт во временный файл
        with open('create_admin_temp.py', 'w', encoding='utf-8') as f:
            f.write(create_user_script)
        
        # Выполняем через Django shell
        import subprocess
        try:
            result = subprocess.run([
                'docker-compose', 'exec', '-T', 'backend', 
                'python', 'manage.py', 'shell', '-c', 
                'exec(open("create_admin_temp.py").read())'
            ], capture_output=True, text=True, cwd='.')
            
            if result.returncode == 0:
                print_success("Админский пользователь создан")
                print_info(f"Вывод: {result.stdout}")
                return True
            else:
                print_error(f"Ошибка создания админа: {result.stderr}")
                return False
                
        except Exception as e:
            print_error(f"Ошибка выполнения команды: {e}")
            return False
    
    def login_as_admin(self):
        """Авторизация как админ"""
        print_info("Авторизация как админ...")
        
        # Получаем CSRF токен
        if not self.get_csrf_token():
            return False
        
        # Данные для входа
        login_data = {
            'username': 'testadmin',
            'password': 'testpass123',
            'csrfmiddlewaretoken': self.csrf_token
        }
        
        # Авторизуемся через админку
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/login/",
                data=login_data,
                headers={'Referer': f"{BASE_URL}/admin/login/"}
            )
            
            if response.status_code == 302 or 'admin' in response.url:
                print_success("Авторизация успешна")
                return True
            else:
                print_error(f"Ошибка авторизации: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Ошибка при авторизации: {e}")
            return False
    
    def test_authenticated_endpoints(self):
        """Тест endpoints с авторизацией"""
        print_header("ТЕСТ ENDPOINTS С АВТОРИЗАЦИЕЙ")
        
        endpoints = [
            # Основные ViewSet endpoints
            (f"{API_BASE}/director/personnel/", "Персонал"),
            (f"{API_BASE}/director/partners/", "Партнеры"),
            (f"{API_BASE}/director/personnel/expert-applications/", "Заявки экспертов"),
            
            # Специфические действия
            (f"{API_BASE}/director/personnel/performance/", "Производительность персонала"),
            (f"{API_BASE}/director/personnel/statistics/", "Статистика персонала"),
        ]
        
        results = {}
        
        for url, description in endpoints:
            try:
                response = self.session.get(url)
                print_info(f"Тестирую: {url}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        print_success(f"{description}: OK")
                        
                        if isinstance(data, list):
                            print_info(f"  Элементов: {len(data)}")
                        elif isinstance(data, dict):
                            print_info(f"  Ключи: {list(data.keys())}")
                            
                        results[description] = True
                        
                    except json.JSONDecodeError:
                        print_error(f"{description}: Ответ не JSON")
                        results[description] = False
                        
                elif response.status_code == 404:
                    print_warning(f"{description}: Endpoint не найден (404)")
                    results[description] = False
                elif response.status_code == 401:
                    print_error(f"{description}: Все еще требует авторизации (401)")
                    results[description] = False
                elif response.status_code == 403:
                    print_error(f"{description}: Доступ запрещен (403)")
                    results[description] = False
                else:
                    print_error(f"{description}: HTTP {response.status_code}")
                    results[description] = False
                    
            except Exception as e:
                print_error(f"{description}: {str(e)}")
                results[description] = False
        
        return results
    
    def test_director_data(self):
        """Тест получения данных директора"""
        print_header("ТЕСТ ДАННЫХ ДИРЕКТОРА")
        
        # Проверяем основные данные
        try:
            # Заказы
            orders_response = self.session.get(f"{API_BASE}/orders/orders/")
            if orders_response.status_code == 200:
                orders = orders_response.json()
                print_success(f"Заказы: {len(orders)} шт.")
                
                # Анализируем заказы
                if orders:
                    completed_orders = [o for o in orders if o.get('status') == 'completed']
                    total_amount = sum(float(o.get('price', 0)) for o in completed_orders)
                    print_info(f"  Завершенных заказов: {len(completed_orders)}")
                    print_info(f"  Общая сумма: {total_amount:.2f} руб.")
            else:
                print_error(f"Заказы: HTTP {orders_response.status_code}")
            
            # Пользователи
            users_response = self.session.get(f"{API_BASE}/users/")
            if users_response.status_code == 200:
                users = users_response.json()
                print_success(f"Пользователи: {len(users)} шт.")
                
                # Анализируем роли
                roles = {}
                for user in users:
                    role = user.get('role', 'unknown')
                    roles[role] = roles.get(role, 0) + 1
                print_info(f"  Роли: {roles}")
            else:
                print_warning(f"Пользователи: HTTP {users_response.status_code}")
                
        except Exception as e:
            print_error(f"Ошибка при получении данных: {e}")
    
    def run_full_test(self):
        """Полный тест с авторизацией"""
        print_header("ПОЛНЫЙ ТЕСТ КАБИНЕТА ДИРЕКТОРА")
        
        # Создаем админа
        if not self.create_admin_user():
            print_error("Не удалось создать админского пользователя")
            return False
        
        # Авторизуемся
        if not self.login_as_admin():
            print_error("Не удалось авторизоваться")
            return False
        
        # Тестируем endpoints
        results = self.test_authenticated_endpoints()
        
        # Тестируем данные
        self.test_director_data()
        
        # Итоговый отчет
        print_header("ИТОГОВЫЙ ОТЧЕТ")
        
        total_tests = len(results)
        passed_tests = sum(1 for success in results.values() if success)
        
        print_info(f"Всего тестов: {total_tests}")
        print_info(f"Пройдено: {passed_tests}")
        print_info(f"Не пройдено: {total_tests - passed_tests}")
        
        if passed_tests > 0:
            print_success(f"Некоторые функции работают ({passed_tests}/{total_tests})")
        else:
            print_warning("Ни один тест не прошел")
        
        # Показываем рабочие функции
        working_functions = [name for name, success in results.items() if success]
        if working_functions:
            print_success("Работающие функции:")
            for func in working_functions:
                print_success(f"  ✓ {func}")
        
        # Показываем проблемные функции
        failed_functions = [name for name, success in results.items() if not success]
        if failed_functions:
            print_warning("Проблемные функции:")
            for func in failed_functions:
                print_warning(f"  ✗ {func}")
        
        return passed_tests > 0

if __name__ == "__main__":
    tester = DirectorTester()
    success = tester.run_full_test()
    
    if success:
        print_success("\nТестирование завершено. Некоторые функции работают.")
    else:
        print_error("\nТестирование завершено. Требуется дополнительная настройка.")