
export const BREAKPOINTS = {
  MOBILE: 840,
  TABLET: 1024,
} as const;

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ORDER_STATUSES = {
  NEW: 'new',
  CONFIRMING: 'confirming',
  AWAITING_EXPERT_ACCEPTANCE: 'awaiting_expert_acceptance',
  IN_PROGRESS: 'in_progress',
  WAITING_PAYMENT: 'waiting_payment',
  REVIEW: 'review',
  COMPLETED: 'completed',
  REVISION: 'revision',
  DOWNLOAD: 'download',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  DISPUTE: 'dispute',
  EXPIRED: 'expired',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  confirming: 'На подтверждении',
  awaiting_expert_acceptance: 'Ожидает ответа эксперта',
  in_progress: 'В работе',
  waiting_payment: 'Ожидает оплаты',
  review: 'На проверке',
  completed: 'Завершен',
  revision: 'На доработке',
  download: 'Ожидает скачивания',
  closed: 'Закрыт',
  cancelled: 'Отменён',
  dispute: 'Спор',
  expired: 'Истёк срок',
  under_review: 'На проверке',
  canceled: 'Отменён',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  awaiting_expert_acceptance: 'blue',
  new: 'green',
  confirming: 'orange',
  in_progress: 'purple',
  waiting_payment: 'gold',
  review: 'cyan',
  completed: 'green',
  revision: 'magenta',
  download: 'purple',
  closed: 'default',
  cancelled: 'red',
  dispute: 'volcano',
  expired: 'default',
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
  medium: 'purple',
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
  messages: '/messages',
  auth: {
    googleCallback: '/auth/google/callback',
    googleCallbackLegacy: '/google-callback',
  },
  createOrder: '/create-order',
  becomeExpert: '/become-expert',
  becomePartner: '/become-partner',
  partners: '/partners',
  expert: {
    root: '/expert',
    clientOrders: '/expert/client-orders',
    application: '/expert-application',
    profile: '/expert/:username',
  },
  user: {
    profile: '/user/:username',
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
    root: '/support',
    detail: '/support-chat/:chatId',
  },
};

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  new: 'Новый',
  confirming: 'На подтверждении',
  awaiting_expert_acceptance: 'Ожидает ответа эксперта',
  in_progress: 'В работе',
  waiting_payment: 'Ожидает оплаты',
  review: 'На проверке',
  completed: 'Завершён',
  revision: 'На доработке',
  download: 'Ожидает скачивания',
  closed: 'Закрыт',
  cancelled: 'Отменён',
  canceled: 'Отменён',
  dispute: 'Спор',
  expired: 'Истёк срок',
  under_review: 'На проверке',
  open: 'Открыт',
  resolved: 'Решён',
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
  sent: 'Отправлено',
  read: 'Прочитано',
  replied: 'Ответ получен',
  draft: 'Черновик',
  archived: 'В архиве',
  scheduled: 'Запланировано',
  pending_approval: 'Ожидает согласования',
  needs_revision: 'На доработке',
  deactivated: 'Деактивировано',
  submitted: 'Подано',
  investigating: 'Расследуется',
  awaiting_response: 'Ожидает ответа',
  in_mediation: 'На медиации',
  assigned: 'Назначен',
  waiting_response: 'Ожидает ответа',
  on_hold: 'Приостановлен',
  deleted: 'Удалён',
  disputed: 'Оспорен',
  upheld: 'Удовлетворён',
  restored: 'Восстановлен',
  rejected_order: 'Отклонён',
};

export const translateStatusInText = (text: string): string => {
  if (!text) return text;
  let result = text;
  for (const [raw, label] of Object.entries(STATUS_DISPLAY_NAMES)) {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`['"]\\s*${escaped}\\s*['"]`, 'gi');
    result = result.replace(pattern, `'${label}'`);
  }
  return result;
};
