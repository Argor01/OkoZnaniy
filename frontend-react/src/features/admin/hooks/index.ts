
export { useAdminAuth } from './useAdminAuth';
export { useAdminData } from './useAdminData';
export { useAdminMutations } from './useAdminMutations';
export { useAdminUI } from './useAdminUI';
export { useConfirmModal } from './useConfirmModal';
export { useSupportRequests } from './useSupportRequests';

export { useRequestProcessing } from './useRequestProcessing';

// New hooks exports
export { 
  useUsers, 
  useAllUsers, 
  useBlockedUsers, 
  useRoles, 
  usePermissions, 
  useUserActions, 
  useRoleActions 
} from './useAdminUsers';

export { 
  useClaims, 
  useClaimActions 
} from './useAdminClaims';

export { 
  useWorks, 
  useWorkActions 
} from './useAdminWorks';

export { 
  useTariffs, 
  useTariffActions, 
  useCommissions, 
  useCommissionActions 
} from './useAdminFinance';

export { 
  useSupportChats, 
  useSupportActions 
} from './useAdminSupport';

export { 
  useChatRooms, 
  useAdminChatRooms, 
  useChatMessages, 
  useChatActions, 
  useChatRoomActions 
} from './useAdminChats';

export { 
  useTickets, 
  useTicket,
  useTicketActions,
  useAdminUsers
} from './useAdminTickets';

export { useAdminStats } from './useAdminStats';

// Re-export specific legacy hooks if needed for backward compatibility until full migration
// export * from './useAdminPanelData';
