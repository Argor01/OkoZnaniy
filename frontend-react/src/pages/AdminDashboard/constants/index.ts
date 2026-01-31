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