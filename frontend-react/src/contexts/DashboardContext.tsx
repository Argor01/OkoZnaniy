import React, { createContext, useContext } from 'react';

interface DashboardContextType {
  openProfileModal: () => void;
  openMessageModal: (userId?: number) => void;
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
  openNotificationsModal: () => {},
  openArbitrationModal: () => {},
  openFinanceModal: () => {},
  openFriendsModal: () => {},
  openFaqModal: () => {},
  openFriendProfileModal: () => {},
  closeAllModals: () => {},
});

export const useDashboard = () => useContext(DashboardContext);
