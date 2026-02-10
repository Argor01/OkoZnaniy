/**
 * Экспорт всех хуков AdminDashboard
 * Централизованный импорт для удобства
 */

export { useAdminAuth } from './useAdminAuth';
export { useAdminData } from './useAdminData';
export { useAdminMutations } from './useAdminMutations';
export { useAdminUI } from './useAdminUI';
export { useConfirmModal } from './useConfirmModal';
export { useSupportRequests } from './useSupportRequests';

// 🆕 Новые хуки для обработки запросов
export { useRequestProcessing } from './useRequestProcessing';
export { useAdminChats } from './useAdminChats';

// 🆕 Хуки для работы с реальными данными из API
export * from './useAdminPanelData';
