
// This file is deprecated. Please use the individual hooks from features/admin/hooks/
// useAdminUsers.ts, useAdminClaims.ts, useAdminWorks.ts, useAdminFinance.ts, useAdminSupport.ts, useAdminChats.ts, useAdminTickets.ts, useAdminStats.ts

export { useAllUsers, useBlockedUsers, useUserActions } from './useAdminUsers';
export { useClaims, useClaimActions } from './useAdminClaims';
export { useWorks, useWorkActions } from './useAdminWorks';
export { useTariffs, useTariffActions, useCommissions, useCommissionActions } from './useAdminFinance';
export { useSupportChats, useSupportActions } from './useAdminSupport';
export { useChatRooms as useAdminChatRooms, useChatRoomActions } from './useAdminChats';
export { useTickets, useTicketActions } from './useAdminTickets';
export { useAdminStats } from './useAdminStats';
