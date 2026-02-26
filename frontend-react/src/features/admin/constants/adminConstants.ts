
import { QUERY_KEYS as GLOBAL_QUERY_KEYS } from '@/config/queryKeys';

// UI Constants - Re-exported from global UI config
export { 
  LAYOUT_CONSTANTS, 
  BREAKPOINTS, 
  TABLE_CONSTANTS, 
  MODAL_CONSTANTS, 
  STATUS_COLORS, 
  NOTIFICATION_CONSTANTS, 
  DATE_FORMATS, 
  LIMITS 
} from '@/config/ui';

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


export { USER_ROLES } from '@/utils/constants';

export const QUERY_KEYS = {
  ADMIN_PARTNERS: GLOBAL_QUERY_KEYS.admin.partners,
  ADMIN_EARNINGS: GLOBAL_QUERY_KEYS.admin.earnings,
  ADMIN_DISPUTES: GLOBAL_QUERY_KEYS.admin.disputes,
  ADMIN_ARBITRATORS: GLOBAL_QUERY_KEYS.admin.arbitrators,
  ADMIN_CLAIMS: GLOBAL_QUERY_KEYS.admin.claims,
  ADMIN_USERS: GLOBAL_QUERY_KEYS.admin.users,
  ADMIN_ROLES: GLOBAL_QUERY_KEYS.admin.roles,
  ADMIN_PERMISSIONS: GLOBAL_QUERY_KEYS.admin.permissions,
  ADMIN_ORDERS: GLOBAL_QUERY_KEYS.admin.orders,
  ADMIN_PROBLEM_ORDERS: GLOBAL_QUERY_KEYS.admin.problemOrders,
  ADMIN_CHAT_ROOMS: GLOBAL_QUERY_KEYS.admin.chatRooms,
  ADMIN_DIRECTOR_COMMUNICATIONS: GLOBAL_QUERY_KEYS.admin.directorCommunications,
  ADMIN_DIRECTOR_COMMUNICATION_MESSAGES: GLOBAL_QUERY_KEYS.admin.directorCommunicationMessages,
  ADMIN_BLOCKED_USERS: GLOBAL_QUERY_KEYS.admin.blockedUsers,
  ADMIN_SUPPORT_REQUESTS: GLOBAL_QUERY_KEYS.admin.supportRequests,
  ADMIN_SUPPORT_MESSAGES: GLOBAL_QUERY_KEYS.admin.supportMessages,
  ADMIN_SUPPORT_CHATS: GLOBAL_QUERY_KEYS.admin.supportChats,
  ADMIN_TICKETS: GLOBAL_QUERY_KEYS.admin.tickets,
  ADMIN_STATS: GLOBAL_QUERY_KEYS.admin.stats,
  ADMIN_WORKS: GLOBAL_QUERY_KEYS.admin.works,
  ADMIN_TARIFFS: GLOBAL_QUERY_KEYS.admin.tariffs,
  ADMIN_COMMISSIONS: GLOBAL_QUERY_KEYS.admin.commissions,
  ADMIN_INTERNAL_MESSAGES: GLOBAL_QUERY_KEYS.admin.internalMessages,
  ADMIN_MEETING_REQUESTS: GLOBAL_QUERY_KEYS.admin.meetingRequests,
  ADMIN_INTERNAL_UNREAD_COUNT: GLOBAL_QUERY_KEYS.admin.internalUnreadCount,
} as const;


export { QUERY_CONFIG } from '@/config/queryKeys';
