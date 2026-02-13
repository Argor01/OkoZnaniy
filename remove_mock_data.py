#!/usr/bin/env python3
"""
Скрипт для удаления всех моковых данных из компонентов админ-панели
"""
import os
import re
from pathlib import Path

# Список файлов для обработки
FILES_TO_PROCESS = [
    "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/BlockedUsersSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/CategoriesSubjectsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/ClaimsProcessingSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedClaimsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedRequestsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/DirectorCommunicationSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressClaimsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressRequestsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/NewClaimsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/NotificationsSettingsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/OpenRequestsSection.tsx",
    "frontend-react/src/pages/AdminDashboard/components/Sections/PendingApprovalSection.tsx",
]

def remove_mock_data_from_file(file_path):
    """Удаляет моковые данные из файла"""
    print(f"\nОбработка: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"  ✗ Файл не найден")
        return False
    
    # Читаем файл
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Паттерн 1: Удаляем комментарий и объявление моковых данных
    # Ищем от комментария "// Мок данные" до закрывающей ];
    pattern1 = r'  // Мок данные для демонстрации\n  const mock\w+:.*?\n  \];'
    content = re.sub(pattern1, '', content, flags=re.DOTALL)
    
    # Паттерн 2: Удаляем объявление моковых данных без комментария
    pattern2 = r'  const mock\w+:.*?\n  \];'
    content = re.sub(pattern2, '', content, flags=re.DOTALL)
    
    # Паттерн 3: Заменяем использование моковых данных на реальные
    # const categoriesData = categories.length > 0 ? categories : mockCategories;
    # -> const categoriesData = categories;
    pattern3 = r'const (\w+Data) = (\w+)\.length > 0 \? \2 : mock\w+;'
    content = re.sub(pattern3, r'const \1 = \2;', content)
    
    # Паттерн 4: const dataSource = orders.length > 0 ? orders : mockOrders;
    pattern4 = r'const dataSource = (\w+)\.length > 0 \? \1 : mock\w+;'
    content = re.sub(pattern4, r'const dataSource = \1;', content)
    
    # Паттерн 5: Другие варианты
    pattern5 = r'const (\w+) = (\w+)\.length > 0 \? \2 : mock\w+;'
    content = re.sub(pattern5, r'const \1 = \2;', content)
    
    # Удаляем лишние пустые строки (больше 2 подряд)
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    # Проверяем, были ли изменения
    if content == original_content:
        print(f"  - Моковые данные не найдены или уже удалены")
        return False
    
    # Создаем резервную копию
    backup_path = file_path + '.backup'
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(original_content)
    
    # Сохраняем изменения
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Моковые данные удалены")
    print(f"  ✓ Резервная копия: {backup_path}")
    return True

def main():
    print("="*60)
    print("УДАЛЕНИЕ МОКОВЫХ ДАННЫХ ИЗ АДМИН-ПАНЕЛИ")
    print("="*60)
    
    processed = 0
    modified = 0
    
    for file_path in FILES_TO_PROCESS:
        processed += 1
        if remove_mock_data_from_file(file_path):
            modified += 1
    
    print("\n" + "="*60)
    print(f"ГОТОВО!")
    print(f"Обработано файлов: {processed}")
    print(f"Изменено файлов: {modified}")
    print("="*60)
    
    if modified > 0:
        print("\nРезервные копии сохранены с расширением .backup")
        print("Для восстановления используйте:")
        print("  find frontend-react -name '*.backup' -exec bash -c 'mv \"$0\" \"${0%.backup}\"' {} \\;")
    
    print("\nДля применения изменений выполните:")
    print("  docker-compose build frontend")
    print("  docker-compose up -d frontend")

if __name__ == '__main__':
    main()
