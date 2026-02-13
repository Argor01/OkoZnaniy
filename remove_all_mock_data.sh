#!/bin/bash

# Скрипт для удаления всех моковых данных из компонентов админ-панели

echo "Удаление моковых данных из компонентов админ-панели..."

# Список файлов для обработки
files=(
  "frontend-react/src/pages/AdminDashboard/components/Sections/AdminChatsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/BlockedUsersSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/CategoriesSubjectsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/ClaimsProcessingSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedClaimsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedRequestsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/DirectorCommunicationSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressClaimsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressRequestsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/NewClaimsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/NotificationsSettingsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/OpenRequestsSection.tsx"
  "frontend-react/src/pages/AdminDashboard/components/Sections/PendingApprovalSection.tsx"
)

echo "Файлы для обработки:"
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (не найден)"
  fi
done

echo ""
echo "Обработка файлов..."
echo ""

# Функция для удаления моковых данных из файла
process_file() {
  local file=$1
  local filename=$(basename "$file")
  
  echo "Обрабатываю $filename..."
  
  # Создаем резервную копию
  cp "$file" "$file.backup"
  
  # Используем Python для более точной обработки
  python3 << 'PYTHON_SCRIPT'
import sys
import re

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Паттерны для удаления моковых данных
patterns = [
    # Удаляем объявления моковых данных
    (r'  // Мок данные для демонстрации\n  const mock\w+:.*?\];', ''),
    (r'  const mock\w+:.*?\];', ''),
    
    # Заменяем использование моковых данных на реальные
    (r'const (\w+)Data = (\w+)\.length > 0 \? \2 : mock\1;', r'const \1Data = \2;'),
    (r'const dataSource = (\w+)\.length > 0 \? \1 : mock\w+;', r'const dataSource = \1;'),
    (r'const (\w+) = (\w+)\.length > 0 \? \2 : mock\w+;', r'const \1 = \2;'),
]

original_content = content
for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Сохраняем только если были изменения
if content != original_content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ Обработан: {file_path}")
else:
    print(f"  - Без изменений: {file_path}")

PYTHON_SCRIPT
  
  if [ $? -eq 0 ]; then
    echo "  ✓ Успешно обработан"
  else
    echo "  ✗ Ошибка обработки"
    # Восстанавливаем из резервной копии
    mv "$file.backup" "$file"
  fi
  
  echo ""
}

# Обрабатываем каждый файл
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    process_file "$file"
  fi
done

echo "Готово!"
echo ""
echo "Резервные копии сохранены с расширением .backup"
echo "Если что-то пошло не так, можно восстановить файлы:"
echo "  find frontend-react -name '*.backup' -exec bash -c 'mv \"\$0\" \"\${0%.backup}\"' {} \;"
