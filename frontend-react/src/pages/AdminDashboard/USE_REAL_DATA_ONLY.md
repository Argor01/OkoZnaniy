# Использование только реальных данных из БД

## Проблема
Все компоненты админ-панели используют паттерн:
```typescript
const dataSource = apiData.length > 0 ? apiData : mockData;
```

Это означает, что если API возвращает пустой массив (нет данных в БД), показываются моковые данные.

## Решение
Заменить все такие строки на:
```typescript
const dataSource = apiData; // Используем только реальные данные
```

## Список файлов для исправления:

1. AdminChatsSection.tsx - строка 299
2. AllOrdersSection.tsx - строка 207
3. BlockedUsersSection.tsx - строка 122
4. DirectorCommunicationSection.tsx - строки 303-304
5. CompletedRequestsSection.tsx - строка 201
6. InProgressClaimsSection.tsx - строка 239
7. InProgressRequestsSection.tsx - строка 438
8. CompletedClaimsSection.tsx - строка 321
9. NewClaimsSection.tsx - строка 192
10. NotificationsSettingsSection.tsx - строки 204-206
11. ClaimsProcessingSection.tsx - строка 431
12. OpenRequestsSection.tsx - строка 338
13. CategoriesSubjectsSection.tsx - строки 278-280
14. PendingApprovalSection.tsx - строка 304
15. ProblemOrdersSection.tsx - строка 260
16. SupportChatsSection.tsx - строка 315
17. TariffsSettingsSection.tsx - строки 202-203
18. UserRolesSection.tsx - строки 207-209
19. UsersManagementSection.tsx - строка 192
20. WorksModerationSection.tsx - строка 117

## Также удалить:
- Все объявления `const mockData = [...]`
- Комментарии "// Мок данные для демонстрации"
