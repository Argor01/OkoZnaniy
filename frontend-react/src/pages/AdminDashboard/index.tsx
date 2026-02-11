import React from 'react';
import { Layout, Spin, Alert, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth, useAdminData, useAdminUI, useAdminMutations } from './hooks';
import {
  useAllUsers,
  useBlockedUsers,
  useUserActions,
  useAllOrders,
  useProblemOrders,
  useOrderActions,
  useSupportRequests,
  useSupportActions,
  useClaims,
  useClaimActions,
  useAdminChatRooms,
  useChatRoomActions,
} from './hooks/useAdminPanelData';
import { AdminLayout } from './components/Layout';
import { 
  OverviewSection, 
  PartnersSection, 
  EarningsSection, 
  SupportRequestsSection,
  SupportChatsSection,
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
  OpenRequestsSection,
  InProgressRequestsSection,
  CompletedRequestsSection
} from './components/Sections';
import { PartnerModal, SupportRequestModal } from './components/Modals';
import AdminLogin from '../../components/admin/AdminLogin';
import type { MenuKey, SupportStatus } from './types';
import { DirectorCommunicationSection } from './components/Sections/DirectorCommunicationSection';

const { Content } = Layout;

/**
 * Новый модульный AdminDashboard
 * 
 * Этот компонент заменяет монолитный AdminDashboard.tsx
 * Старый файл переименован в AdminDashboard.tsx.backup
 */
const AdminDashboard: React.FC = () => {
  console.log('🚀 NEW AdminDashboard component loaded!');
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
  
  const adminData = useAdminData(canLoadData);
  
  const { 
    selectedMenu, 
    handleMenuClick, 
    handleEditPartner, 
    handleViewPartner,
    partnerEditModalVisible,
    partnerViewModalVisible,
    selectedPartner,
    closePartnerModals
  } = useAdminUI();
  
  const { 
    markEarningPaid, 
    updatePartner,
    isMarkingEarningPaid, 
    isUpdatingPartner
  } = useAdminMutations();

  // 🆕 Реальные данные из API
  const { users: allUsers, loading: usersLoading } = useAllUsers();
  const { users: blockedUsers, loading: blockedUsersLoading } = useBlockedUsers();
  const { blockUser, unblockUser, changeUserRole } = useUserActions();
  
  const { orders: allOrders, loading: ordersLoading } = useAllOrders();
  const { orders: problemOrders, loading: problemOrdersLoading } = useProblemOrders();
  const { changeOrderStatus } = useOrderActions();
  
  const { requests: openRequests, loading: openRequestsLoading } = useSupportRequests('open');
  const { requests: inProgressRequests, loading: inProgressRequestsLoading } = useSupportRequests('in_progress');
  const { requests: completedRequests, loading: completedRequestsLoading } = useSupportRequests('completed');
  const { takeRequest, completeRequest, sendMessage: sendSupportMessage } = useSupportActions();
  
  const { claims: newClaims, loading: newClaimsLoading } = useClaims('new');
  const { claims: inProgressClaims, loading: inProgressClaimsLoading } = useClaims('in_progress');
  const { claims: completedClaims, loading: completedClaimsLoading } = useClaims('completed');
  const { claims: pendingApprovalClaims, loading: pendingApprovalLoading } = useClaims('pending_approval');
  const { takeInWork, completeClaim, rejectClaim } = useClaimActions();
  
  const { chatRooms, loading: chatRoomsLoading } = useAdminChatRooms();
  const { sendMessage: sendChatMessage, joinRoom, leaveRoom } = useChatRoomActions();

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
    navigate('/director');
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

  // Обработчики для модальных окон
  const handleUpdatePartner = (partnerId: number, data: any) => {
    updatePartner({ partnerId, data });
    closePartnerModals();
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
            onViewUserDetails={(user) => console.log('View user details:', user)}
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
            onUpdateRolePermissions={(roleId, permissions) => console.log('Update role permissions:', roleId, permissions)}
            onCreateRole={(roleData) => console.log('Create role:', roleData)}
            onDeleteRole={(roleId) => console.log('Delete role:', roleId)}
          />
        );

      // Управление заказами
      case 'all_orders':
        return (
          <AllOrdersSection
            orders={allOrders}
            loading={ordersLoading}
            onViewOrder={(orderId) => console.log('View order:', orderId)}
            onEditOrder={(orderId) => console.log('Edit order:', orderId)}
            onChangeOrderStatus={changeOrderStatus}
            onAssignExpert={(orderId, expertId) => console.log('Assign expert:', orderId, expertId)}
            onContactClient={(orderId) => console.log('Contact client:', orderId)}
          />
        );
      
      case 'problem_orders':
        return (
          <ProblemOrdersSection
            orders={problemOrders}
            loading={problemOrdersLoading}
            onViewOrder={(orderId) => console.log('View problem order:', orderId)}
            onResolveIssue={(orderId, resolution) => console.log('Resolve issue:', orderId, resolution)}
            onEscalateIssue={(orderId, escalationNote) => console.log('Escalate issue:', orderId, escalationNote)}
            onContactParticipant={(orderId, participantType) => console.log('Contact participant:', orderId, participantType)}
            onAssignNewExpert={(orderId, expertId) => console.log('Assign new expert:', orderId, expertId)}
          />
        );


      // Новые секции поддержки
      case 'support_chats':
        return (
          <SupportChatsSection
            chats={[...openRequests, ...inProgressRequests]}
            currentUserId={user?.id || 1}
            loading={openRequestsLoading || inProgressRequestsLoading}
            onSendMessage={sendSupportMessage}
            onTakeChat={takeRequest}
            onCloseChat={completeRequest}
            onUploadFile={(chatId, file) => console.log('Upload file:', chatId, file)}
          />
        );

      case 'support_open':
      case 'support_in_progress':
      case 'support_completed':
        {
          const statusMap = {
            support_open: { data: openRequests, loading: openRequestsLoading },
            support_in_progress: { data: inProgressRequests, loading: inProgressRequestsLoading },
            support_completed: { data: completedRequests, loading: completedRequestsLoading },
          };
          const currentStatus = statusMap[selectedMenu as keyof typeof statusMap];
          
          return (
            <SupportRequestsSection
              requests={currentStatus.data}
              loading={currentStatus.loading}
              selectedStatus={selectedMenu.replace('support_', '') as SupportStatus}
              onStatusChange={(status) => console.log('Status change:', status)}
              onRequestClick={(request) => console.log('Request click:', request)}
              onTakeRequest={takeRequest}
            />
          );
        }

      case 'admin_chats':
        return (
          <AdminChatsSection
            chatRooms={chatRooms}
            currentUserId={user?.id || 1}
            loading={chatRoomsLoading}
            onSendMessage={sendChatMessage}
            onCreateRoom={(roomData) => console.log('Create room:', roomData)}
            onJoinRoom={joinRoom}
            onLeaveRoom={leaveRoom}
            onInviteUser={(roomId, userId) => console.log('Invite user:', roomId, userId)}
            onUploadFile={(roomId, file) => console.log('Upload file:', roomId, file)}
          />
        );
      
      // 🆕 Новые секции обработки запросов
      case 'request_processing_open':
        return (
          <OpenRequestsSection
            requests={openRequests}
            loading={openRequestsLoading}
            onViewRequest={(requestId) => console.log('View request:', requestId)}
            onTakeRequest={takeRequest}
            onAssignRequest={(requestId, adminId) => console.log('Assign request:', requestId, adminId)}
            onSendResponse={sendSupportMessage}
            onEscalateRequest={(requestId, reason) => console.log('Escalate request:', requestId, reason)}
            onCloseRequest={completeRequest}
            onAddTags={(requestId, tags) => console.log('Add tags:', requestId, tags)}
            onScheduleCall={(requestId, datetime) => console.log('Schedule call:', requestId, datetime)}
          />
        );

      case 'request_processing_progress':
        return (
          <InProgressRequestsSection
            requests={inProgressRequests}
            loading={inProgressRequestsLoading}
            onViewRequest={(requestId) => console.log('View request:', requestId)}
            onUpdateProgress={(requestId, progress) => console.log('Update progress:', requestId, progress)}
            onSendResponse={sendSupportMessage}
            onCompleteRequest={completeRequest}
            onPauseRequest={(requestId, reason) => console.log('Pause request:', requestId, reason)}
            onResumeRequest={(requestId) => console.log('Resume request:', requestId)}
            onAddNote={(requestId, note) => console.log('Add note:', requestId, note)}
            onScheduleFollowUp={(requestId, datetime, action) => console.log('Schedule follow up:', requestId, datetime, action)}
            onReassignRequest={(requestId, adminId) => console.log('Reassign request:', requestId, adminId)}
          />
        );
      
      case 'request_processing_completed':
        return (
          <CompletedRequestsSection
            requests={completedRequests}
            loading={completedRequestsLoading}
            onViewRequest={(requestId) => console.log('View completed request:', requestId)}
            onReopenRequest={(requestId, reason) => console.log('Reopen request:', requestId, reason)}
            onExportReport={(filters) => console.log('Export completed requests report:', filters)}
            onViewUserProfile={(userId) => console.log('View user profile:', userId)}
            onViewRelatedOrder={(orderId) => console.log('View related order:', orderId)}
            onScheduleFollowUp={(requestId, date, notes) => console.log('Schedule follow up:', requestId, date, notes)}
          />
        );
      
      // 🆕 Внутренняя коммуникация
      case 'internal_communication':
        return (
          <DirectorCommunicationSection
            messages={[]}
            meetingRequests={[]}
            currentUser={user}
            loading={false}
            onSendMessage={(messageData) => console.log('Send message to director:', messageData)}
            onReplyToMessage={(messageId, replyData) => console.log('Reply to message:', messageId, replyData)}
            onMarkAsRead={(messageId) => console.log('Mark as read:', messageId)}
            onArchiveMessage={(messageId) => console.log('Archive message:', messageId)}
            onRequestMeeting={(meetingData) => console.log('Request meeting:', meetingData)}
            onApproveMeeting={(meetingId, approvedDate) => console.log('Approve meeting:', meetingId, approvedDate)}
            onRejectMeeting={(meetingId, reason) => console.log('Reject meeting:', meetingId, reason)}
            onUploadAttachment={async (file) => {
              console.log('Upload attachment:', file);
              return { id: 1, url: '/files/attachment.pdf' };
            }}
          />
        );
      
      // 🆕 Чаты администраторов
      case 'admin_group_chats':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Alert
              message="🆕 Чаты администраторов"
              description="Новый функционал групповых чатов администраторов. Таблицы и хуки созданы!"
              type="info"
              showIcon
            />
          </div>
        );

      // Обращения
      case 'new_claims':
        return (
          <NewClaimsSection
            claims={newClaims}
            loading={newClaimsLoading}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onTakeInWork={takeInWork}
            onRejectClaim={rejectClaim}
            onSendMessage={(claimId, message) => console.log('Send message:', claimId, message)}
          />
        );

      case 'in_progress_claims':
        return (
          <InProgressClaimsSection
            claims={inProgressClaims}
            loading={inProgressClaimsLoading}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onCompleteClaim={completeClaim}
            onUpdateProgress={(claimId, progress) => console.log('Update progress:', claimId, progress)}
            onSendMessage={(claimId, message) => console.log('Send message:', claimId, message)}
          />
        );

      case 'completed_claims':
        return (
          <CompletedClaimsSection
            claims={completedClaims}
            loading={completedClaimsLoading}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onReopenClaim={(claimId, reason) => console.log('Reopen claim:', claimId, reason)}
            onExportReport={(filters) => console.log('Export report:', filters)}
          />
        );

      case 'pending_approval':
        return (
          <PendingApprovalSection
            claims={pendingApprovalClaims}
            loading={pendingApprovalLoading}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onApproveClaim={(claimId, decision) => console.log('Approve claim:', claimId, decision)}
            onRejectApproval={rejectClaim}
            onEscalateToDirector={(claimId) => console.log('Escalate to director:', claimId)}
            onRequestMoreInfo={(claimId, questions) => console.log('Request more info:', claimId, questions)}
          />
        );

      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Alert
              message="Секция в разработке"
              description={`Секция "${selectedMenu}" будет реализована в следующих этапах рефакторинга.`}
              type="info"
              showIcon
            />
          </div>
        );
    }
  };

  // Используем новый AdminLayout
  return (
    <AdminLayout
      user={user}
      selectedMenu={selectedMenu}
      onMenuSelect={handleMenuClick}
      onLogout={handleLogout}
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
      
      {/* Модальное окно поддержки */}
      <SupportRequestModal
        request={null}
        messages={[]}
        isOpen={false}
        onClose={() => console.log('Close modal')}
        onTakeRequest={async (requestId: number) => { console.log('Take request:', requestId); return true; }}
        onCompleteRequest={async (requestId: number) => { console.log('Complete request:', requestId); return true; }}
        onSendMessage={async (requestId: number, message: string) => { console.log('Send message:', requestId, message); return true; }}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
