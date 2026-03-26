
export const BREAKPOINTS = {
  MOBILE: 840,
  TABLET: 1024,
} as const;

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ORDER_STATUSES = {
  NEW: 'new',
  CONFIRMING: 'confirming',
  IN_PROGRESS: 'in_progress',
  WAITING_PAYMENT: 'waiting_payment',
  REVIEW: 'review',
  COMPLETED: 'completed',
  REVISION: 'revision',
  DOWNLOAD: 'download',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  DISPUTE: 'dispute',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirming: 'На подтверждении',
  in_progress: 'В работе',
  waiting_payment: 'Ожидает оплаты',
  review: 'На проверке',
  completed: 'Завершен',
  revision: 'На доработке',
  download: 'Ожидает скачивания',
  closed: 'Закрыт',
  cancelled: 'Отменен',
  dispute: 'Спор',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: 'green',
  confirming: 'orange',
  in_progress: 'purple',
  waiting_payment: 'gold',
  review: 'cyan',
  completed: 'green',
  revision: 'magenta',
  download: 'geekblue',
  closed: 'default',
  cancelled: 'red',
  dispute: 'volcano',
};

export const ORDER_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const ORDER_PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

export const ORDER_PRIORITY_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

export const USER_ROLES = {
  CLIENT: 'client',
  EXPERT: 'expert',
  PARTNER: 'partner',
  ADMIN: 'admin',
  DIRECTOR: 'director',
  ARBITRATOR: 'arbitrator',
} as const;

export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  auth: {
    googleCallback: '/auth/google/callback',
    googleCallbackLegacy: '/google-callback',
  },
  createOrder: '/create-order',
  becomeExpert: '/become-expert',
  becomePartner: '/become-partner',
  expert: {
    root: '/expert',
    application: '/expert-application',
    profile: '/expert/:userId',
  },
  user: {
    profile: '/user/:userId',
  },
  partner: {
    root: '/partner',
  },
  admin: {
    root: '/admin',
    login: '/admin/login',
    directorLogin: '/admin/directorlogin',
    dashboard: '/admin/dashboard',
    directorDashboard: '/admin/directordashboard',
    ticketDetail: '/admin/tickets/:ticketId',
  },
  arbitrator: {
    root: '/arbitrator',
  },
  shop: {
    workDetail: '/shop/works/:workId',
    readyWorks: '/shop/ready-works',
    addWork: '/shop/add-work',
    purchased: '/shop/purchased',
  },
  works: {
    list: '/works',
    detail: '/works/:workId',
  },
  orders: {
    detail: '/orders/:orderId',
    feed: '/orders-feed',
  },
  improvements: {
    survey: '/improvements',
  },
  supportChat: {
    detail: '/support-chat/:chatId',
  },
};
