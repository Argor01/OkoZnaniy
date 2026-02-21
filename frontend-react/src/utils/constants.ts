

export const BREAKPOINTS = {
  MOBILE: 840,
  TABLET: 1024,
} as const;

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const ORDER_STATUSES = {
  NEW: 'new',
  CONFIRMING: 'confirming',
  IN_PROGRESS: 'in_progress',
  PAYMENT: 'payment',
  REVIEW: 'review',
  COMPLETED: 'completed',
  REVISION: 'revision',
  DOWNLOAD: 'download',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Создан',
  confirming: 'На подтверждении',
  in_progress: 'В работе',
  payment: 'Ожидает оплаты',
  review: 'На проверке',
  completed: 'Завершен',
  revision: 'На доработке',
  download: 'Ожидает скачивания',
  closed: 'Закрыт',
  cancelled: 'Отменен',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  confirming: 'orange',
  in_progress: 'purple',
  payment: 'green',
  review: 'cyan',
  completed: 'green',
  revision: 'magenta',
  download: 'geekblue',
  closed: 'default',
  cancelled: 'red',
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
  supportChat: {
    detail: '/support-chat/:chatId',
  },
  becomeExpert: '/become-expert',
  becomePartner: '/become-partner',
} as const;

export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  CLAIM: 'claim',
  MESSAGE: 'message',
  BALANCE: 'balance',
  BID: 'bid',
  SYSTEM: 'system',
} as const;
