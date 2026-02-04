/**
 * Экспорт всех констант AdminDashboard
 * Централизованный импорт для удобства
 */

// Элементы меню
export {
  menuItems,
  titleMap,
  getParentMenuKey,
  isSubmenuItem,
} from './menuItems';

export type { MenuItem } from './menuItems';

// Общие константы
export {
  LAYOUT_CONSTANTS,
  BREAKPOINTS,
  TABLE_CONSTANTS,
  MODAL_CONSTANTS,
  STATUS_COLORS,
  EARNING_TYPES,
  EARNING_TYPE_LABELS,
  ORDER_STATUSES,
  USER_ROLES,
  NOTIFICATION_CONSTANTS,
  DATE_FORMATS,
  LIMITS,
  API_ENDPOINTS,
  QUERY_KEYS,
  QUERY_CONFIG,
} from './adminConstants';

// 🆕 Константы для обработки запросов
export {
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  REQUEST_CATEGORIES,
  REQUEST_STATUS_COLORS,
  REQUEST_PRIORITY_COLORS,
  REQUEST_CATEGORY_COLORS,
  STATUS_FILTER_OPTIONS,
  PRIORITY_FILTER_OPTIONS,
  CATEGORY_FILTER_OPTIONS,
  PRIORITY_ORDER,
  REQUEST_PAGINATION_CONFIG,
  AUTO_REFRESH_INTERVALS,
  FILE_UPLOAD_LIMITS,
  REQUEST_MESSAGES,
  SYSTEM_MESSAGE_TEMPLATES,
  NOTIFICATION_SETTINGS,
} from './requestConstants';