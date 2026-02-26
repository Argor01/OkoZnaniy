export const QUERY_KEYS = {
  // Admin
  admin: {
    partners: ['admin-partners'],
    earnings: ['admin-earnings'],
    disputes: ['admin-disputes'],
    arbitrators: ['admin-arbitrators'],
    claims: (status?: string) => ['admin-claims', status],
    users: ['admin-users'],
    roles: ['admin-roles'],
    permissions: ['admin-permissions'],
    orders: ['admin-orders'],
    problemOrders: ['admin-problem-orders'],
    chatRooms: ['admin-chat-rooms'],
    directorCommunications: ['admin-director-communications'],
    directorCommunicationMessages: (id: number) => ['admin-director-communications', id, 'messages'],
    blockedUsers: ['admin-blocked-users'],
    supportRequests: (status?: string) => ['admin-support-requests', status],
    supportMessages: (id: number) => ['admin-support-messages', id],
    supportChats: ['admin-support-chats'],
    tickets: ['admin-tickets'],
    stats: ['admin-stats'],
    works: (status?: string) => ['admin-works', status],
    tariffs: ['admin-tariffs'],
    commissions: ['admin-commissions'],
    internalMessages: (archived?: boolean) => ['admin-internal-messages', archived],
    meetingRequests: (status?: string) => ['admin-meeting-requests', status],
    internalUnreadCount: ['admin-internal-unread-count'],
  },
  
  // User
  user: {
    profile: ['user-profile'],
  },

  // Orders
  orders: {
    detail: (id: string | number) => ['order', id],
    list: ['orders-list'],
  },
} as const;

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, 
  cacheTime: 10 * 60 * 1000, 
  retry: 2,
  retryDelay: 1000,
} as const;
