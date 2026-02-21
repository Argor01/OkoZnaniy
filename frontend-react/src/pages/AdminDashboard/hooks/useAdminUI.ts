import { useState, useCallback, useEffect } from 'react';
import { Grid } from 'antd';
import type { MenuKey, Partner, Dispute } from '../types';
import type { CustomerRequest, AdminChatGroup } from '../types/requests.types'; 
import { useConfirmModal } from './useConfirmModal';

const { useBreakpoint } = Grid;


export const useAdminUI = () => {
  const screens = useBreakpoint();
  const confirmModal = useConfirmModal();
  
  
  const getSavedMenu = (): MenuKey => {
    try {
      const saved = localStorage.getItem('adminDashboard_selectedMenu');
      return (saved as MenuKey) || 'overview';
    } catch {
      return 'overview';
    }
  };
  
  
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(getSavedMenu());
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  
  const [partnerEditModalVisible, setPartnerEditModalVisible] = useState(false);
  const [partnerViewModalVisible, setPartnerViewModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  
  
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedCustomerRequest, setSelectedCustomerRequest] = useState<CustomerRequest | null>(null);
  
  
  const [adminChatModalVisible, setAdminChatModalVisible] = useState(false);
  const [selectedAdminChat, setSelectedAdminChat] = useState<AdminChatGroup | null>(null);
  
  
  const [createChatModalVisible, setCreateChatModalVisible] = useState(false);
  
  
  const [internalCommModalVisible, setInternalCommModalVisible] = useState(false);

  
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;
  const isDesktop = screens.lg;

  
  useEffect(() => {
    const menu = selectedMenu;
    
    if (['new_claims', 'in_progress_claims', 'completed_claims', 'pending_approval'].includes(menu)) {
      setOpenKeys(['claims']);
    } else if (['support_open', 'support_in_progress', 'support_completed', 'support_chats'].includes(menu)) {
      setOpenKeys(['support']);
    } else if (['request_processing_open', 'request_processing_progress', 'request_processing_completed'].includes(menu)) {
      setOpenKeys(['request_processing']);
    } else if (['all_users', 'blocked_users', 'user_roles'].includes(menu)) {
      setOpenKeys(['users']);
    } else if (['all_orders', 'problem_orders'].includes(menu)) {
      setOpenKeys(['orders']);
    }
  }, [selectedMenu]);

  
  const handleMenuClick = useCallback((key: MenuKey) => {
    setSelectedMenu(key);
    
    
    try {
      localStorage.setItem('adminDashboard_selectedMenu', key);
    } catch (error) {
      console.error('Failed to save menu selection:', error);
    }
    
    
    if (['new_claims', 'in_progress_claims', 'completed_claims', 'pending_approval'].includes(key)) {
      setOpenKeys(['claims']);
    }
    
    
    if (['support_open', 'support_in_progress', 'support_completed'].includes(key)) {
      setOpenKeys(['support']);
    }
    
    
    if (['request_processing_open', 'request_processing_progress', 'request_processing_completed'].includes(key)) {
      setOpenKeys(['request_processing']);
    }
    
    
    if (isMobile) {
      setDrawerVisible(false);
    }
  }, [isMobile]);

  
  const handleEditPartner = useCallback((partner: Partner) => {
    setSelectedPartner(partner);
    setPartnerEditModalVisible(true);
    setIsPartnerModalOpen(true);
  }, []);

  const handleViewPartner = useCallback((partner: Partner) => {
    setSelectedPartner(partner);
    setPartnerViewModalVisible(true);
    setIsPartnerModalOpen(true);
  }, []);

  const closePartnerModals = useCallback(() => {
    setPartnerEditModalVisible(false);
    setPartnerViewModalVisible(false);
    setIsPartnerModalOpen(false);
    setSelectedPartner(null);
  }, []);

  
  const closePartnerModal = useCallback(() => {
    setIsPartnerModalOpen(false);
    setSelectedPartner(null);
  }, []);

  const handlePartnerSave = useCallback(async (data: Partial<Partner>) => {
    try {
      
      console.log('Saving partner:', data);
      closePartnerModal();
    } catch (error) {
      console.error('Error saving partner:', error);
    }
  }, [closePartnerModal]);

  const handlePartnerApprove = useCallback(async (partnerId: number) => {
    const confirmed = await confirmModal.confirm({
      title: 'Подтвердить партнера',
      content: 'Вы уверены, что хотите подтвердить этого партнера?',
      type: 'success'
    });

    if (confirmed) {
      try {
        
        console.log('Approving partner:', partnerId);
        closePartnerModal();
      } catch (error) {
        console.error('Error approving partner:', error);
      }
    }
  }, [confirmModal, closePartnerModal]);

  const handlePartnerReject = useCallback(async (partnerId: number, reason: string) => {
    const confirmed = await confirmModal.confirm({
      title: 'Отклонить партнера',
      content: `Вы уверены, что хотите отклонить этого партнера? Причина: ${reason}`,
      type: 'warning'
    });

    if (confirmed) {
      try {
        
        console.log('Rejecting partner:', partnerId, reason);
        closePartnerModal();
      } catch (error) {
        console.error('Error rejecting partner:', error);
      }
    }
  }, [confirmModal, closePartnerModal]);

  const handlePartnerBlock = useCallback(async (partnerId: number) => {
    const confirmed = await confirmModal.confirm({
      title: 'Заблокировать партнера',
      content: 'Вы уверены, что хотите заблокировать этого партнера?',
      type: 'error'
    });

    if (confirmed) {
      try {
        
        console.log('Blocking partner:', partnerId);
        closePartnerModal();
      } catch (error) {
        console.error('Error blocking partner:', error);
      }
    }
  }, [confirmModal, closePartnerModal]);

  
  const handleViewDispute = useCallback((dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeModalVisible(true);
    setIsDisputeModalOpen(true);
  }, []);

  const closeDisputeModals = useCallback(() => {
    setDisputeModalVisible(false);
    setIsDisputeModalOpen(false);
    setSelectedDispute(null);
  }, []);

  
  const closeDisputeModal = useCallback(() => {
    setIsDisputeModalOpen(false);
    setSelectedDispute(null);
  }, []);

  const handleAssignArbitrator = useCallback(async (disputeId: number, arbitratorId: number) => {
    try {
      
      console.log('Assigning arbitrator:', disputeId, arbitratorId);
    } catch (error) {
      console.error('Error assigning arbitrator:', error);
    }
  }, []);

  const handleResolveDispute = useCallback(async (disputeId: number, resolution: string, winner: 'customer' | 'expert') => {
    const confirmed = await confirmModal.confirm({
      title: 'Разрешить спор',
      content: `Вы уверены, что хотите разрешить спор в пользу ${winner === 'customer' ? 'заказчика' : 'эксперта'}?`,
      type: 'info'
    });

    if (confirmed) {
      try {
        console.log('Resolving dispute:', disputeId, resolution, winner);
        closeDisputeModal();
      } catch (error) {
        console.error('Error resolving dispute:', error);
      }
    }
  }, [confirmModal, closeDisputeModal]);

  const handleAddDisputeComment = useCallback(async (disputeId: number, comment: string) => {
    try {
      console.log('Adding comment to dispute:', disputeId, comment);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);
  const handleViewRequest = useCallback((request: CustomerRequest) => {
    setSelectedCustomerRequest(request);
    setRequestModalVisible(true);
  }, []);

  const closeRequestModal = useCallback(() => {
    setRequestModalVisible(false);
    setSelectedCustomerRequest(null);
  }, []);
  const handleViewAdminChat = useCallback((chat: AdminChatGroup) => {
    setSelectedAdminChat(chat);
    setAdminChatModalVisible(true);
  }, []);

  const closeAdminChatModal = useCallback(() => {
    setAdminChatModalVisible(false);
    setSelectedAdminChat(null);
  }, []);
  const openCreateChatModal = useCallback(() => {
    setCreateChatModalVisible(true);
  }, []);

  const closeCreateChatModal = useCallback(() => {
    setCreateChatModalVisible(false);
  }, []);
  const openInternalCommModal = useCallback(() => {
    setInternalCommModalVisible(true);
  }, []);

  const closeInternalCommModal = useCallback(() => {
    setInternalCommModalVisible(false);
  }, []);

  const resetUI = useCallback(() => {
    setSelectedMenu('overview');
    setOpenKeys([]);
    setDrawerVisible(false);
    closePartnerModals();
    closeDisputeModals();
    closeRequestModal();
    closeAdminChatModal();
    closeCreateChatModal();
    closeInternalCommModal();
  }, [
    closePartnerModals,
    closeDisputeModals,
    closeRequestModal,
    closeAdminChatModal,
    closeCreateChatModal,
    closeInternalCommModal,
  ]);

  return {
    selectedMenu,
    openKeys,
    setOpenKeys,
    handleMenuClick,
    drawerVisible,
    openDrawer,
    closeDrawer,
    isMobile,
    isTablet,
    isDesktop,
    screens,
    partnerEditModalVisible,
    partnerViewModalVisible,
    selectedPartner,
    handleEditPartner,
    handleViewPartner,
    closePartnerModals,
    disputeModalVisible,
    selectedDispute,
    handleViewDispute,
    closeDisputeModals,
    isPartnerModalOpen,
    isDisputeModalOpen,
    closePartnerModal,
    closeDisputeModal,
    requestModalVisible,
    selectedCustomerRequest,
    handleViewRequest,
    closeRequestModal,
    adminChatModalVisible,
    selectedAdminChat,
    handleViewAdminChat,
    closeAdminChatModal,
    createChatModalVisible,
    openCreateChatModal,
    closeCreateChatModal,
    internalCommModalVisible,
    openInternalCommModal,
    closeInternalCommModal,
    handlePartnerSave,
    handlePartnerApprove,
    handlePartnerReject,
    handlePartnerBlock,
    handleAssignArbitrator,
    handleResolveDispute,
    handleAddDisputeComment,
    resetUI,
  };
};
