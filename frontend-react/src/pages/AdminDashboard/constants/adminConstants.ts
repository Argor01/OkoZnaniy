


export const LAYOUT_CONSTANTS = {
  SIDER_WIDTH: 250,
  SIDER_WIDTH_TABLET: 200,
  SIDER_COLLAPSED_WIDTH: 0,
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 48,
  CONTENT_PADDING: 24,
  CONTENT_PADDING_TABLET: 16,
  CONTENT_PADDING_MOBILE: 12,
} as const;


export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
} as const;


export const TABLE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: ['10', '20', '50', '100'],
  SCROLL_Y: 400,
} as const;


export const MODAL_CONSTANTS = {
  DEFAULT_WIDTH: 600,
  LARGE_WIDTH: 800,
  EXTRA_LARGE_WIDTH: 1000,
  MASK_STYLE: {
    backdropFilter: 'blur(4px)',
  },
} as const;


export const STATUS_COLORS = {
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#ff4d4f',
  INFO: '#1890ff',
  PROCESSING: '#1890ff',
  DEFAULT: '#d9d9d9',
} as const;


export const EARNING_TYPES = {
  ORDER: 'order',
  REGISTRATION: 'registration',
  BONUS: 'bonus',
} as const;

export const EARNING_TYPE_LABELS = {
  [EARNING_TYPES.ORDER]: 'Заказ',
  [EARNING_TYPES.REGISTRATION]: 'Регистрация',
  [EARNING_TYPES.BONUS]: 'Бонус',
} as const;


export const ORDER_STATUSES = {
  NEW: 'new',
  WAITING_PAYMENT: 'waiting_payment',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  REVISION: 'revision',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;


export const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  EXPERT: 'expert',
  PARTNER: 'partner',
  ARBITRATOR: 'arbitrator',
  DIRECTOR: 'director',
} as const;


export const NOTIFICATION_CONSTANTS = {
  SUCCESS_DURATION: 3,
  ERROR_DURATION: 5,
  WARNING_DURATION: 4,
  INFO_DURATION: 3,
} as const;


export const DATE_FORMATS = {
  DATE: 'DD.MM.YYYY',
  DATETIME: 'DD.MM.YYYY HH:mm',
  TIME: 'HH:mm',
  MONTH_YEAR: 'MM.YYYY',
} as const;


export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, 
  MAX_MESSAGE_LENGTH: 1000,
  MAX_SUBJECT_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;


export const API_ENDPOINTS = {
  PARTNERS: '/api/admin/partners/',
  EARNINGS: '/api/admin/earnings/',
  DISPUTES: '/api/admin/disputes/',
  ARBITRATORS: '/api/admin/arbitrators/',
  CLAIMS: '/api/admin/claims/',
} as const;


export const QUERY_KEYS = {
  ADMIN_PARTNERS: ['admin-partners'],
  ADMIN_EARNINGS: ['admin-earnings'],
  ADMIN_DISPUTES: ['admin-disputes'],
  ADMIN_ARBITRATORS: ['admin-arbitrators'],
  ADMIN_CLAIMS: ['admin-claims'],
} as const;


export const QUERY_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, 
  CACHE_TIME: 10 * 60 * 1000, 
  RETRY: 2,
  RETRY_DELAY: 1000,
} as const;