// UI константы и настройки

// Брейкпоинты для адаптивности
export const BREAKPOINTS = {
  mobile: 840,
  tablet: 1024,
  desktop: 1280,
  wide: 1920,
} as const;

// Размеры сайдбара
export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_COLLAPSED_WIDTH = 80;

// Размеры хедера
export const HEADER_HEIGHT = 64;
export const MOBILE_HEADER_HEIGHT = 56;

// Отступы
export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Радиусы скругления
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: '50%',
} as const;

// Тени
export const BOX_SHADOW = {
  sm: '0 2px 8px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.1)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  xl: '0 12px 32px rgba(0,0,0,0.15)',
} as const;

// Цвета (основные)
export const COLORS = {
  primary: '#1890ff',
  secondary: '#764ba2',
  success: '#52c41a',
  warning: '#f59e0b',
  error: '#ff4d4f',
  info: '#1890ff',
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

// Градиенты
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  info: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
} as const;

// Z-индексы
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Анимации
export const TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.3s ease',
  slow: '0.5s ease',
} as const;
