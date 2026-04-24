
export const BREAKPOINTS = {
  mobile: 840,
  tablet: 1024,
  desktop: 1280,
  wide: 1920,
  // Alias for backward compatibility or different naming conventions
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
} as const;


export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_COLLAPSED_WIDTH = 80;


export const HEADER_HEIGHT = 64;
export const MOBILE_HEADER_HEIGHT = 56;

export const LAYOUT_CONSTANTS = {
  SIDER_WIDTH: SIDEBAR_WIDTH,
  SIDER_WIDTH_TABLET: 200,
  SIDER_COLLAPSED_WIDTH: 0,
  HEADER_HEIGHT: HEADER_HEIGHT,
  FOOTER_HEIGHT: 48,
  CONTENT_PADDING: 24,
  CONTENT_PADDING_TABLET: 16,
  CONTENT_PADDING_MOBILE: 12,
} as const;


export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;


export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: '50%',
} as const;


export const BOX_SHADOW = {
  sm: '0 2px 8px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.1)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  xl: '0 12px 32px rgba(0,0,0,0.15)',
} as const;


export const COLORS = {
  primary: '#2b9fe6',
  secondary: '#764ba2',
  success: '#52c41a',
  warning: '#f59e0b',
  error: '#ff4d4f',
  info: '#2b9fe6',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    disabled: '#9ca3af',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
    dark: '#1f2937',
  },
  border: {
    light: '#e5e7eb',
    default: '#d1d5db',
    dark: '#9ca3af',
  },
} as const;

export const STATUS_COLORS = {
  SUCCESS: COLORS.success,
  WARNING: '#faad14', // Slightly different from COLORS.warning (#f59e0b)
  ERROR: COLORS.error,
  INFO: COLORS.info,
  PROCESSING: '#2b9fe6',
  DEFAULT: '#d9d9d9',
} as const;


export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  info: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
} as const;


export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;


export const TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.3s ease',
  slow: '0.5s ease',
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
  MAX_FILE_SIZE: 50 * 1024 * 1024, 
  MAX_MESSAGE_LENGTH: 1000,
  MAX_SUBJECT_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;
