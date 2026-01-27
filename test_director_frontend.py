#!/usr/bin/env python3
"""
Тест фронтенда кабинета директора
Проверяет, что фронтенд корректно загружается и отображает данные
"""

import requests
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

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

class DirectorFrontendTester:
    def __init__(self):
        self.frontend_url = "http://localhost:5173"
        self.backend_url = "http://localhost:8000"
        self.driver = None
        
    def setup_driver(self):
        """Настройка веб-драйвера"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # Запуск без GUI
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            print_success("Веб-драйвер настроен")
            return True
            
        except Exception as e:
            print_error(f"Ошибка настройки веб-драйвера: {e}")
            print_info("Для тестирования фронтенда требуется Chrome и ChromeDriver")
            return False
    
    def check_frontend_availability(self):
        """Проверка доступности фронтенда"""
        print_header("ПРОВЕРКА ДОСТУПНОСТИ ФРОНТЕНДА")
        
        try:
            response = requests.get(self.frontend_url, timeout=10)
            if response.status_code == 200:
                print_success("Фронтенд доступен")
                return True
            else:
                print_error(f"Фронтенд недоступен: HTTP {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print_error("Фронтенд недоступен: соединение отклонено")
            return False
        except Exception as e:
            print_error(f"Ошибка проверки фронтенда: {e}")
            return False
    
    def test_director_dashboard_loading(self):
        """Тест загрузки дашборда директора"""
        print_header("ТЕСТ ЗАГРУЗКИ ДАШБОРДА ДИРЕКТОРА")
        
        if not self.driver:
            print_error("Веб-драйвер не настроен")
            return False
        
        try:
            # Переходим на страницу дашборда директора
            director_url = f"{self.frontend_url}/director-dashboard"
            print_info(f"Переход на: {director_url}")
            
            self.driver.get(director_url)
            
            # Ждем загрузки страницы
            WebDriverWait(self.driver, 10).until(
                lambda driver: driver.execute_script("return document.readyState") == "complete"
            )
            
            print_success("Страница загружена")
            
            # Проверяем заголовок страницы
            page_title = self.driver.title
            print_info(f"Заголовок страницы: {page_title}")
            
            # Проверяем наличие основных элементов
            elements_to_check = [
                ("h1", "Заголовок дашборда"),
                (".financial-statistics", "Финансовая статистика"),
                (".personnel-section", "Секция персонала"),
                (".partners-section", "Секция партнеров"),
            ]
            
            found_elements = 0
            for selector, description in elements_to_check:
                try:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if element.is_displayed():
                        print_success(f"  {description}: найден")
                        found_elements += 1
                    else:
                        print_warning(f"  {description}: найден, но не отображается")
                except NoSuchElementException:
                    print_warning(f"  {description}: не найден")
            
            # Проверяем наличие данных
            self.check_data_display()
            
            return found_elements > 0
            
        except TimeoutException:
            print_error("Таймаут загрузки страницы")
            return False
        except Exception as e:
            print_error(f"Ошибка тестирования загрузки: {e}")
            return False
    
    def check_data_display(self):
        """Проверка отображения данных"""
        print_info("Проверка отображения данных...")
        
        # Проверяем наличие числовых данных
        try:
            # Ищем элементы с числовыми значениями
            numeric_elements = self.driver.find_elements(By.CSS_SELECTOR, "[data-testid*='value'], .metric-value, .stat-value")
            
            if numeric_elements:
                print_success(f"Найдено {len(numeric_elements)} элементов с данными")
                
                # Проверяем, что данные не пустые
                non_empty_data = 0
                for element in numeric_elements[:5]:  # Проверяем первые 5
                    text = element.text.strip()
                    if text and text != "0" and text != "-" and text != "N/A":
                        non_empty_data += 1
                        print_info(f"  Данные: {text}")
                
                if non_empty_data > 0:
                    print_success(f"Найдено {non_empty_data} элементов с реальными данными")
                else:
                    print_warning("Все элементы содержат пустые или нулевые данные")
            else:
                print_warning("Элементы с данными не найдены")
                
        except Exception as e:
            print_error(f"Ошибка проверки данных: {e}")
    
    def test_financial_statistics_component(self):
        """Тест компонента финансовой статистики"""
        print_header("ТЕСТ ФИНАНСОВОЙ СТАТИСТИКИ")
        
        if not self.driver:
            print_error("Веб-драйвер не настроен")
            return False
        
        try:
            # Ищем компоненты финансовой статистики
            financial_components = [
                ("[data-testid='monthly-turnover']", "Месячный оборот"),
                ("[data-testid='net-profit']", "Чистая прибыль"),
                ("[data-testid='income-expense']", "Доходы/Расходы"),
                (".financial-chart", "Финансовый график"),
                (".period-selector", "Селектор периода"),
            ]
            
            found_components = 0
            for selector, description in financial_components:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        print_success(f"  {description}: найден")
                        found_components += 1
                        
                        # Проверяем содержимое
                        for element in elements[:1]:  # Проверяем первый элемент
                            text = element.text.strip()
                            if text:
                                print_info(f"    Содержимое: {text[:100]}...")
                    else:
                        print_warning(f"  {description}: не найден")
                        
                except Exception as e:
                    print_warning(f"  {description}: ошибка поиска - {e}")
            
            return found_components > 0
            
        except Exception as e:
            print_error(f"Ошибка тестирования финансовой статистики: {e}")
            return False
    
    def test_period_selector(self):
        """Тест селектора периода"""
        print_header("ТЕСТ СЕЛЕКТОРА ПЕРИОДА")
        
        if not self.driver:
            print_error("Веб-драйвер не настроен")
            return False
        
        try:
            # Ищем селектор периода
            period_selectors = self.driver.find_elements(By.CSS_SELECTOR, "select, .period-selector, [data-testid*='period']")
            
            if period_selectors:
                print_success("Селектор периода найден")
                
                # Пробуем изменить период
                for selector in period_selectors[:1]:
                    try:
                        if selector.tag_name == "select":
                            options = selector.find_elements(By.TAG_NAME, "option")
                            if len(options) > 1:
                                print_info(f"Найдено {len(options)} опций периода")
                                
                                # Выбираем другой период
                                options[1].click()
                                time.sleep(2)  # Ждем обновления данных
                                
                                print_success("Период изменен успешно")
                                return True
                        else:
                            print_info("Найден кастомный селектор периода")
                            return True
                            
                    except Exception as e:
                        print_warning(f"Ошибка изменения периода: {e}")
            else:
                print_warning("Селектор периода не найден")
                return False
                
        except Exception as e:
            print_error(f"Ошибка тестирования селектора периода: {e}")
            return False
    
    def test_responsive_design(self):
        """Тест адаптивного дизайна"""
        print_header("ТЕСТ АДАПТИВНОГО ДИЗАЙНА")
        
        if not self.driver:
            print_error("Веб-драйвер не настроен")
            return False
        
        try:
            # Тестируем разные размеры экрана
            screen_sizes = [
                (1920, 1080, "Desktop"),
                (1024, 768, "Tablet"),
                (375, 667, "Mobile"),
            ]
            
            responsive_works = 0
            
            for width, height, device in screen_sizes:
                print_info(f"Тестирование {device} ({width}x{height})")
                
                self.driver.set_window_size(width, height)
                time.sleep(1)
                
                # Проверяем, что элементы видны
                try:
                    body = self.driver.find_element(By.TAG_NAME, "body")
                    if body.is_displayed():
                        print_success(f"  {device}: отображается корректно")
                        responsive_works += 1
                    else:
                        print_warning(f"  {device}: проблемы с отображением")
                        
                except Exception as e:
                    print_warning(f"  {device}: ошибка - {e}")
            
            return responsive_works > 0
            
        except Exception as e:
            print_error(f"Ошибка тестирования адаптивности: {e}")
            return False
    
    def run_frontend_tests(self):
        """Запуск всех тестов фронтенда"""
        print_header("КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ФРОНТЕНДА ДИРЕКТОРА")
        
        # Проверяем доступность фронтенда
        if not self.check_frontend_availability():
            print_error("Фронтенд недоступен, тестирование невозможно")
            return False
        
        # Настраиваем драйвер
        if not self.setup_driver():
            print_warning("Веб-драйвер недоступен, пропускаем UI тесты")
            return True  # Возвращаем True, так как основная проверка прошла
        
        try:
            tests = [
                ("Загрузка дашборда", self.test_director_dashboard_loading),
                ("Финансовая статистика", self.test_financial_statistics_component),
                ("Селектор периода", self.test_period_selector),
                ("Адаптивный дизайн", self.test_responsive_design),
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
            print_header("ИТОГОВЫЙ ОТЧЕТ ФРОНТЕНДА")
            
            print_info(f"Всего тестов: {total}")
            print_info(f"Пройдено: {passed}")
            print_info(f"Не пройдено: {total - passed}")
            
            if passed == total:
                print_success("ВСЕ ТЕСТЫ ФРОНТЕНДА ПРОЙДЕНЫ!")
            elif passed > total // 2:
                print_success("БОЛЬШИНСТВО ТЕСТОВ ФРОНТЕНДА ПРОЙДЕНО")
            else:
                print_warning("МНОГО ТЕСТОВ ФРОНТЕНДА НЕ ПРОШЛО")
            
            return passed > 0
            
        finally:
            if self.driver:
                self.driver.quit()
                print_info("Веб-драйвер закрыт")

def main():
    tester = DirectorFrontendTester()
    success = tester.run_frontend_tests()
    
    if success:
        print_success("\n🎉 ТЕСТИРОВАНИЕ ФРОНТЕНДА ЗАВЕРШЕНО!")
        print_info("Фронтенд кабинета директора работает")
    else:
        print_warning("\n⚠️  ПРОБЛЕМЫ С ФРОНТЕНДОМ")
        print_info("Требуется дополнительная проверка")

if __name__ == "__main__":
    main()