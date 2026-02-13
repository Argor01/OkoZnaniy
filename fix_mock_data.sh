#!/bin/bash

# Скрипт для замены моковых данных на реальные в админ-панели

echo "Исправление использования моковых данных..."

# Функция для замены в файле
fix_file() {
    local file=$1
    local old_pattern=$2
    local new_value=$3
    
    if [ -f "$file" ]; then
        sed -i "s/$old_pattern/$new_value/g" "$file"
        echo "✓ Исправлен: $file"
    fi
}

# Исправляем все компоненты
fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/UsersManagementSection.tsx" \
    "dataSource={users.length > 0 ? users : mockUsers}" \
    "dataSource={users}"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/BlockedUsersSection.tsx" \
    "const dataSource = users.length > 0 ? users : mockBlockedUsers;" \
    "const dataSource = users;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/ProblemOrdersSection.tsx" \
    "const dataSource = orders.length > 0 ? orders : mockProblemOrders;" \
    "const dataSource = orders;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/OpenRequestsSection.tsx" \
    "const requestsData = requests.length > 0 ? requests : mockRequests;" \
    "const requestsData = requests;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressRequestsSection.tsx" \
    "const requestsData = requests.length > 0 ? requests : mockRequests;" \
    "const requestsData = requests;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedRequestsSection.tsx" \
    "const requestsData = requests.length > 0 ? requests : mockRequests;" \
    "const requestsData = requests;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/NewClaimsSection.tsx" \
    "const claimsData = claims.length > 0 ? claims : mockClaims;" \
    "const claimsData = claims;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/InProgressClaimsSection.tsx" \
    "const claimsData = claims.length > 0 ? claims : mockClaims;" \
    "const claimsData = claims;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/CompletedClaimsSection.tsx" \
    "const claimsData = claims.length > 0 ? claims : mockClaims;" \
    "const claimsData = claims;"

fix_file "frontend-react/src/pages/AdminDashboard/components/Sections/PendingApprovalSection.tsx" \
    "const claimsData = claims.length > 0 ? claims : mockClaims;" \
    "const claimsData = claims;"

echo ""
echo "✅ Все файлы исправлены! Теперь админ-панель использует только реальные данные из БД."
echo "Пересоберите фронтенд: docker-compose build frontend && docker-compose up -d frontend"
