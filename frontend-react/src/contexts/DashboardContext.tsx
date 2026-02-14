import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  openProfileModal: () => void;
  openMessageModal: (userId?: number) => void;
  openOrderChat: (orderId: number, userId: number) => void;
  openContextChat: (userId: number, title: string, workId?: number) => void;
  openNotificationsModal: () => void;
  openArbitrationModal: () => void;
  openFinanceModal: () => void;
  openFriendsModal: () => void;
  openFaqModal: () => void;
  openFriendProfileModal: (friend: any) => void;
  closeAllModals: () => void;
}

export const DashboardContext = createContext<DashboardContextType>({
  openProfileModal: () => {},
  openMessageModal: () => {},
  openOrderChat: () => {},
  openContextChat: () => {},
  openNotificationsModal: () => {},
  openArbitrationModal: () => {},
  openFinanceModal: () => {},
  openFriendsModal: () => {},
  openFaqModal: () => {},
  openFriendProfileModal: () => {},
  closeAllModals: () => {},
});

export const useDashboard = () => useContext(DashboardContext);
