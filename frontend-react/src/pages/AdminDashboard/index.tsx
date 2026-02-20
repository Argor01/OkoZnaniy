import React from 'react';
import { Layout, Spin, Alert, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth, useAdminData, useAdminUI, useAdminMutations } from './hooks';
import { useInternalCommunication } from './hooks/useInternalCommunication';
import { User } from '../../api/auth';
import { ROUTES } from '../../utils/constants';
import {
  useAllUsers,
  useBlockedUsers,
  useUserActions,
  useAllOrders,
  useProblemOrders,
  useOrderActions,
  useSupportRequests,
  useSupportChats,
  useSupportActions,
  useClaims,
  useClaimActions,
  useAdminChatRooms,
  useChatRoomActions,
  useTickets,
  useTicketActions,
} from './hooks/useAdminPanelData';
import { AdminLayout } from './components/Layout';
import { 
  OverviewSection, 
  PartnersSection, 
  EarningsSection, 
  SupportChatsSection,
  TicketSystemSection,
  UsersManagementSection,
  BlockedUsersSection,
  UserRolesSection,
  AllOrdersSection,
  ProblemOrdersSection,
  NewClaimsSection,
  InProgressClaimsSection,
  CompletedClaimsSection,
  PendingApprovalSection,
  AdminChatsSection,
} from './components/Sections';
import { PartnerModal, DisputeModal, SupportRequestModal } from './components/Modals';
import AdminLogin from '../../components/admin/AdminLogin';
import type { MenuKey } from './types';

const { Content } = Layout;

/**
 * Новый модульный AdminDashboard
 * 
 * Этот компонент заменяет монолитный AdminDashboard.tsx
 * Старый файл переименован в AdminDashboard.tsx.backup
 */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Используем новые хуки
  const { 
    user, 
    loading, 
    hasToken,
    isAuthenticated, 
    canLoadData,
    isDirector,
    handleLoginSuccess,
    handleLogout
  } = useAdminAuth();

  // Показываем спиннер во время загрузки
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  // Показываем форму входа если не авторизован
  if (!hasToken || !user) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  // Перенаправляем директора
  if (isDirector) {
    navigate(ROUTES.admin.directorDashboard);
    return null;
  }

  // Проверяем права доступа
  if (user.role !== 'admin') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Result
            status="403"
            title="Доступ запрещен"
            subTitle="У вас нет прав для доступа к личному кабинету администратора."
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                Вернуться на главную
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  // Рендерим основной контент только после успешной авторизации
  return <AdminDashboardContent user={user} onLogout={handleLogout} />;
};

/**
 * Компонент с основным контентом админ-панели
 * Рендерится только после успешной авторизации
 */
const AdminDashboardContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const adminData = useAdminData(true); // Всегда true, т.к. компонент рендерится только после авторизации
  
  const { 
    selectedMenu, 
    handleMenuClick, 
    handleEditPartner, 
    handleViewPartner,
    handleViewDispute,
    partnerEditModalVisible,
    partnerViewModalVisible,
    disputeModalVisible,
    selectedPartner,
    selectedDispute,
    closePartnerModals,
    closeDisputeModals
  } = useAdminUI();
  
  const { 
    markEarningPaid, 
    updatePartner,
    assignArbitrator, 
    isMarkingEarningPaid, 
    isUpdatingPartner,
    isAssigningArbitrator 
  } = useAdminMutations();

  // Реальные данные из API - загружаем только если пользователь авторизован
  const { users: allUsers, loading: usersLoading } = useAllUsers(true);
  const { users: blockedUsers, loading: blockedUsersLoading } = useBlockedUsers(true);
  const { blockUser, unblockUser, changeUserRole } = useUserActions();
  
  const { orders: allOrders, loading: ordersLoading } = useAllOrders(true);
  const { orders: problemOrders, loading: problemOrdersLoading } = useProblemOrders(true);
  const { changeOrderStatus } = useOrderActions();
  
  const { chats: supportChats, loading: supportChatsLoading } = useSupportChats(true);
  const { sendChatMessage: sendSupportChatMessage } = useSupportActions();
  
  // Тикеты
  const { tickets, loading: ticketsLoading, refetch: refetchTickets } = useTickets(true);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus, updatePriority: updateTicketPriority } = useTicketActions();
  
  const { claims: newClaims, loading: newClaimsLoading } = useClaims('new', true);
  const { claims: inProgressClaims, loading: inProgressClaimsLoading } = useClaims('in_progress', true);
  const { claims: completedClaims, loading: completedClaimsLoading } = useClaims('completed', true);
  const { claims: pendingApprovalClaims, loading: pendingApprovalLoading } = useClaims('pending_approval', true);
  const { takeInWork, completeClaim, rejectClaim } = useClaimActions();
  
  const { chatRooms, loading: chatRoomsLoading } = useAdminChatRooms(true);
  const { sendMessage: sendChatMessage, joinRoom, leaveRoom } = useChatRoomActions();

  // Обработчики для модальных окон
  const handleUpdatePartner = (partnerId: number, data: any) => {
    updatePartner({ partnerId, data });
    closePartnerModals();
  };

  const handleAssignArbitratorToDispute = (disputeId: number, arbitratorId: number) => {
    assignArbitrator({ disputeId, arbitratorId });
    closeDisputeModals();
  };

  // Рендерим соответствующую секцию
  const renderSection = () => {
    switch (selectedMenu) {
      case 'overview':
        return (
          <OverviewSection
            stats={adminData.stats}
            partners={adminData.partners}
            earnings={adminData.earnings}
            isLoading={adminData.isLoading}
          />
        );
      
      case 'partners':
        return (
          <PartnersSection
            partners={adminData.partners}
            loading={adminData.partnersLoading}
            onEdit={handleEditPartner}
            onView={handleViewPartner}
          />
        );
      
      case 'earnings':
        return (
          <EarningsSection
            earnings={adminData.earnings}
            loading={adminData.earningsLoading}
            onMarkAsPaid={markEarningPaid}
            isMarkingPaid={isMarkingEarningPaid}
          />
        );
      
      // Управление пользователями
      case 'all_users':
        return (
          <UsersManagementSection
            users={allUsers}
            loading={usersLoading}
            onBlockUser={blockUser}
            onUnblockUser={unblockUser}
            onChangeRole={changeUserRole}
          />
        );
      
      case 'blocked_users':
        return (
          <BlockedUsersSection
            users={blockedUsers}
            loading={blockedUsersLoading}
            onUnblockUser={unblockUser}
            onViewUserDetails={() => {}}
          />
        );

      case 'user_roles':
        return (
          <UserRolesSection
            users={allUsers}
            roles={[]}
            permissions={[]}
            loading={usersLoading}
            onChangeUserRole={changeUserRole}
          />
        );

      // Управление заказами
      case 'all_orders':
        return (
          <AllOrdersSection
            orders={allOrders}
            loading={ordersLoading}
            onViewOrder={(orderId) => { void orderId; }}
            onEditOrder={(orderId) => { void orderId; }}
            onChangeOrderStatus={changeOrderStatus}
            onAssignExpert={(orderId, expertId) => { void orderId; void expertId; }}
            onContactClient={(orderId) => { void orderId; }}
          />
        );
      
      case 'problem_orders':
        return (
          <ProblemOrdersSection
            orders={problemOrders}
            loading={problemOrdersLoading}
            onViewOrder={(orderId) => { void orderId; }}
            onResolveIssue={(orderId, resolution) => { void orderId; void resolution; }}
            onEscalateIssue={(orderId, escalationNote) => { void orderId; void escalationNote; }}
            onContactParticipant={(orderId, participantType) => { void orderId; void participantType; }}
            onAssignNewExpert={(orderId, expertId) => { void orderId; void expertId; }}
          />
        );


      // Новые секции поддержки
      case 'support_chats':
        return (
          <SupportChatsSection
            chats={supportChats}
            currentUserId={user?.id || 1}
            loading={supportChatsLoading}
            onSendMessage={sendSupportChatMessage}
            onTakeChat={(chatId) => { void chatId; }}
            onCloseChat={(chatId) => { void chatId; }}
            onUploadFile={(chatId, file) => { void chatId; void file; }}
          />
        );

      case 'tickets':
        return (
          <TicketSystemSection
            tickets={tickets}
            loading={ticketsLoading}
            onSendMessage={async (ticketId, message) => {
              const ticket = tickets.find((t: any) => t.id === ticketId);
              if (ticket) {
                await sendTicketMessage(ticketId, message, ticket.type);
                refetchTickets();
              }
            }}
            onUpdateStatus={async (ticketId, status) => {
              const ticket = tickets.find((t: any) => t.id === ticketId);
              if (ticket) {
                await updateTicketStatus(ticketId, status, ticket.type);
                refetchTickets();
              }
            }}
            onUpdatePriority={async (ticketId, priority) => {
              const ticket = tickets.find((t: any) => t.id === ticketId);
              if (ticket) {
                await updateTicketPriority(ticketId, priority, ticket.type);
                refetchTickets();
              }
            }}
          />
        );

      case 'admin_chats':
        return (
          <AdminChatsSection
            chatRooms={chatRooms}
            currentUserId={user?.id || 1}
            loading={chatRoomsLoading}
            onSendMessage={sendChatMessage}
            onCreateRoom={(roomData) => { void roomData; }}
            onJoinRoom={joinRoom}
            onLeaveRoom={leaveRoom}
            onInviteUser={(roomId, userId) => { void roomId; void userId; }}
            onUploadFile={(roomId, file) => { void roomId; void file; }}
          />
        );
      
      // Обращения
      case 'new_claims':
        
        return (
          <NewClaimsSection
            claims={newClaims}
            loading={newClaimsLoading}
            onViewClaim={(claimId) => { void claimId; }}
            onTakeInWork={takeInWork}
            onRejectClaim={rejectClaim}
            onSendMessage={(claimId, claimMessage) => { void claimId; void claimMessage; }}
          />
        );

      case 'in_progress_claims':
        return (
          <InProgressClaimsSection
            claims={inProgressClaims}
            loading={inProgressClaimsLoading}
            onViewClaim={(claimId) => { void claimId; }}
            onCompleteClaim={completeClaim}
            onUpdateProgress={(claimId, progress) => { void claimId; void progress; }}
            onSendMessage={(claimId, claimMessage) => { void claimId; void claimMessage; }}
          />
        );

      case 'completed_claims':
        return (
          <CompletedClaimsSection
            claims={completedClaims}
            loading={completedClaimsLoading}
            onViewClaim={(claimId) => { void claimId; }}
            onReopenClaim={(claimId, reason) => { void claimId; void reason; }}
            onExportReport={(filters) => { void filters; }}
          />
        );

      case 'pending_approval':
        return (
          <PendingApprovalSection
            claims={pendingApprovalClaims}
            loading={pendingApprovalLoading}
            onViewClaim={(claimId) => { void claimId; }}
            onApproveClaim={(claimId, decision) => { void claimId; void decision; }}
            onRejectApproval={(claimId, reason) => { void claimId; void reason; }}
            onEscalateToDirector={(claimId) => { void claimId; }}
            onRequestMoreInfo={(claimId, questions) => { void claimId; void questions; }}
          />
        );
    }
  };

  // Используем новый AdminLayout
  return (
    <AdminLayout
      user={user}
      selectedMenu={selectedMenu}
      onMenuSelect={handleMenuClick}
      onLogout={onLogout}
    >
      {renderSection()}
      
      {/* Модальные окна */}
      <PartnerModal
        visible={partnerEditModalVisible}
        partner={selectedPartner}
        onCancel={closePartnerModals}
        onUpdate={handleUpdatePartner}
        isUpdating={isUpdatingPartner}
        mode="edit"
      />
      
      <PartnerModal
        visible={partnerViewModalVisible}
        partner={selectedPartner}
        onCancel={closePartnerModals}
        onUpdate={handleUpdatePartner}
        isUpdating={isUpdatingPartner}
        mode="view"
      />
      
      <DisputeModal
        visible={disputeModalVisible}
        dispute={selectedDispute}
        onCancel={closeDisputeModals}
        onAssignArbitrator={(dispute) => {
          // Логика назначения арбитра уже в DisputesSection
          closeDisputeModals();
        }}
      />
      
      {/* Модальное окно поддержки */}
      <SupportRequestModal
        request={null}
        messages={[]}
        isOpen={false}
        onClose={() => {}}
        onTakeRequest={async (requestId: number) => {  return true; }}
        onCompleteRequest={async (requestId: number) => {  return true; }}
        onSendMessage={async (requestId: number, message: string) => {  return true; }}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
