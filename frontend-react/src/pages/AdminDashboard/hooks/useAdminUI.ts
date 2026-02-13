import { useState, useCallback, useEffect } from 'react';
import { Grid } from 'antd';
import type { MenuKey, Partner, Dispute } from '../types';
import type { CustomerRequest, AdminChatGroup } from '../types/requests.types'; // 🆕
import { useConfirmModal } from './useConfirmModal';

const { useBreakpoint } = Grid;

/**
 * Хук для управления UI состоянием админской панели
 * Управляет модальными окнами, выбранными элементами, состоянием меню
 */
export const useAdminUI = () => {
  const screens = useBreakpoint();
  const confirmModal = useConfirmModal();
  
  // Загружаем сохраненную вкладку из localStorage или используем 'overview' по умолчанию
  const getSavedMenu = (): MenuKey => {
    try {
      const saved = localStorage.getItem('adminDashboard_selectedMenu');
      return (saved as MenuKey) || 'overview';
    } catch {
      return 'overview';
    }
  };
  
  // Состояние меню
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>(getSavedMenu());
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Состояние модальных окон партнеров (старые)
  const [partnerEditModalVisible, setPartnerEditModalVisible] = useState(false);
  const [partnerViewModalVisible, setPartnerViewModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Состояние модальных окон споров (старые)
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // Новые состояния модальных окон
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  
  // 🆕 Состояния модальных окон для запросов
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedCustomerRequest, setSelectedCustomerRequest] = useState<CustomerRequest | null>(null);
  
  // 🆕 Состояния модальных окон для чатов администраторов
  const [adminChatModalVisible, setAdminChatModalVisible] = useState(false);
  const [selectedAdminChat, setSelectedAdminChat] = useState<AdminChatGroup | null>(null);
  
  // 🆕 Состояние модального окна создания чата
  const [createChatModalVisible, setCreateChatModalVisible] = useState(false);
  
  // 🆕 Состояние модального окна внутренней коммуникации
  const [internalCommModalVisible, setInternalCommModalVisible] = useState(false);

  // Адаптивность
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;
  const isDesktop = screens.lg;

  // Автоматически открываем нужное подменю при загрузке
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

  /**
   * Обработчик выбора пункта меню
   * Сохраняет выбранную вкладку в localStorage
   */
  const handleMenuClick = useCallback((key: MenuKey) => {
    setSelectedMenu(key);
    
    // Сохраняем выбранную вкладку в localStorage
    try {
      localStorage.setItem('adminDashboard_selectedMenu', key);
    } catch (error) {
      console.error('Failed to save menu selection:', error);
    }
    
    // Если выбран подпункт обращений, открываем меню "Обращения"
    if (['new_claims', 'in_progress_claims', 'completed_claims', 'pending_approval'].includes(key)) {
      setOpenKeys(['claims']);
    }
    
    // 🆕 Если выбран подпункт поддержки, открываем меню "Поддержка клиентов"
    if (['support_open', 'support_in_progress', 'support_completed'].includes(key)) {
      setOpenKeys(['support']);
    }
    
    // 🆕 Если выбран подпункт обработки запросов, открываем меню "Обработка запросов"
    if (['request_processing_open', 'request_processing_progress', 'request_processing_completed'].includes(key)) {
      setOpenKeys(['request_processing']);
    }
    
    // Закрываем drawer на мобильных после выбора
    if (isMobile) {
      setDrawerVisible(false);
    }
  }, [isMobile]);

  /**
   * Обработчики для партнеров (старые)
   */
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

  /**
   * Новые обработчики для партнеров
   */
  const closePartnerModal = useCallback(() => {
    setIsPartnerModalOpen(false);
    setSelectedPartner(null);
  }, []);

  const handlePartnerSave = useCallback(async (data: Partial<Partner>) => {
    try {
      // Здесь будет логика сохранения партнера
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
        // Здесь будет логика подтверждения партнера
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
        // Здесь будет логика отклонения партнера
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
        // Здесь будет логика блокировки партнера
        console.log('Blocking partner:', partnerId);
        closePartnerModal();
      } catch (error) {
        console.error('Error blocking partner:', error);
      }
    }
  }, [confirmModal, closePartnerModal]);

  /**
   * Обработчики для споров (старые)
   */
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

  /**
   * Новые обработчики для споров
   */
  const closeDisputeModal = useCallback(() => {
    setIsDisputeModalOpen(false);
    setSelectedDispute(null);
  }, []);

  const handleAssignArbitrator = useCallback(async (disputeId: number, arbitratorId: number) => {
    try {
      // Здесь будет логика назначения арбитра
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
        // Здесь будет логика разрешения спора
        console.log('Resolving dispute:', disputeId, resolution, winner);
        closeDisputeModal();
      } catch (error) {
        console.error('Error resolving dispute:', error);
      }
    }
  }, [confirmModal, closeDisputeModal]);

  const handleAddDisputeComment = useCallback(async (disputeId: number, comment: string) => {
    try {
      // Здесь будет логика добавления комментария
      console.log('Adding comment to dispute:', disputeId, comment);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, []);

  /**
   * Управление drawer'ом
   */
  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  // 🆕 Обработчики для модальных окон запросов
  const handleViewRequest = useCallback((request: CustomerRequest) => {
    setSelectedCustomerRequest(request);
    setRequestModalVisible(true);
  }, []);

  const closeRequestModal = useCallback(() => {
    setRequestModalVisible(false);
    setSelectedCustomerRequest(null);
  }, []);

  // 🆕 Обработчики для модальных окон чатов администраторов
  const handleViewAdminChat = useCallback((chat: AdminChatGroup) => {
    setSelectedAdminChat(chat);
    setAdminChatModalVisible(true);
  }, []);

  const closeAdminChatModal = useCallback(() => {
    setAdminChatModalVisible(false);
    setSelectedAdminChat(null);
  }, []);

  // 🆕 Обработчики для модального окна создания чата
  const openCreateChatModal = useCallback(() => {
    setCreateChatModalVisible(true);
  }, []);

  const closeCreateChatModal = useCallback(() => {
    setCreateChatModalVisible(false);
  }, []);

  // 🆕 Обработчики для модального окна внутренней коммуникации
  const openInternalCommModal = useCallback(() => {
    setInternalCommModalVisible(true);
  }, []);

  const closeInternalCommModal = useCallback(() => {
    setInternalCommModalVisible(false);
  }, []);

  /**
   * Сброс всех состояний UI
   */
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
    // Состояние меню
    selectedMenu,
    openKeys,
    setOpenKeys,
    handleMenuClick,

    // Состояние drawer
    drawerVisible,
    openDrawer,
    closeDrawer,

    // Адаптивность
    isMobile,
    isTablet,
    isDesktop,
    screens,

    // Модальные окна партнеров (старые - для совместимости)
    partnerEditModalVisible,
    partnerViewModalVisible,
    selectedPartner,
    handleEditPartner,
    handleViewPartner,
    closePartnerModals,

    // Модальные окна споров (старые - для совместимости)
    disputeModalVisible,
    selectedDispute,
    handleViewDispute,
    closeDisputeModals,

    // Новые модальные окна
    isPartnerModalOpen,
    isDisputeModalOpen,
    closePartnerModal,
    closeDisputeModal,
    
    // 🆕 Модальные окна запросов
    requestModalVisible,
    selectedCustomerRequest,
    handleViewRequest,
    closeRequestModal,
    
    // 🆕 Модальные окна чатов администраторов
    adminChatModalVisible,
    selectedAdminChat,
    handleViewAdminChat,
    closeAdminChatModal,
    
    // 🆕 Модальное окно создания чата
    createChatModalVisible,
    openCreateChatModal,
    closeCreateChatModal,
    
    // 🆕 Модальное окно внутренней коммуникации
    internalCommModalVisible,
    openInternalCommModal,
    closeInternalCommModal,
    
    // Обработчики действий
    handlePartnerSave,
    handlePartnerApprove,
    handlePartnerReject,
    handlePartnerBlock,
    handleAssignArbitrator,
    handleResolveDispute,
    handleAddDisputeComment,

    // Утилиты
    resetUI,
  };
};
