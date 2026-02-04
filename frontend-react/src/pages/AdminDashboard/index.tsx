import React from 'react';
import { Layout, Spin, Alert, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth, useAdminData, useAdminUI, useAdminMutations, useSupportRequests, useRequestProcessing, useAdminChats } from './hooks';
import { AdminLayout } from './components/Layout';
import { 
  OverviewSection, 
  PartnersSection, 
  EarningsSection, 
  DisputesSection,
  SupportRequestsSection,
  UsersManagementSection,
  BlockedUsersSection,
  UserRolesSection,
  AllOrdersSection,
  ProblemOrdersSection,
  WorksModerationSection,
  CategoriesSubjectsSection,
  NewClaimsSection,
  InProgressClaimsSection,
  CompletedClaimsSection,
  PendingApprovalSection,
  ClaimsProcessingSection,
  AdminChatsSection,
  OpenRequestsSection,
  InProgressRequestsSection,
  CompletedRequestsSection,
  CommunicationSection
} from './components/Sections';
import { PartnerModal, DisputeModal, SupportRequestModal } from './components/Modals';
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

  // Хук для поддержки
  const supportData = useSupportRequests();

  // 🆕 Новые хуки для обработки запросов
  const requestProcessingData = useRequestProcessing();
  const adminChatsData = useAdminChats();

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
            disputes={adminData.disputes}
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
      
      case 'disputes':
        return (
          <DisputesSection
            disputes={adminData.disputes}
            arbitrators={adminData.arbitrators}
            loading={adminData.disputesLoading}
            error={adminData.disputesError}
            onViewDispute={handleViewDispute}
            onAssignArbitrator={handleAssignArbitratorToDispute}
            isAssigningArbitrator={isAssigningArbitrator}
          />
        );

      // Управление пользователями
      case 'all_users':
        return (
          <UsersManagementSection
            users={[]}
            loading={false}
            onBlockUser={(userId) => console.log('Block user:', userId)}
            onUnblockUser={(userId) => console.log('Unblock user:', userId)}
            onChangeRole={(userId, role) => console.log('Change role:', userId, role)}
          />
        );
      
      case 'blocked_users':
        return (
          <BlockedUsersSection
            users={[]}
            loading={false}
            onUnblockUser={(userId) => console.log('Unblock user:', userId)}
            onViewUserDetails={(user) => console.log('View user details:', user)}
          />
        );
      
      case 'user_roles':
        return (
          <UserRolesSection
            users={[]}
            roles={[]}
            permissions={[]}
            loading={false}
            onChangeUserRole={(userId, newRole) => console.log('Change user role:', userId, newRole)}
            onUpdateRolePermissions={(roleId, permissions) => console.log('Update role permissions:', roleId, permissions)}
            onCreateRole={(roleData) => console.log('Create role:', roleData)}
            onDeleteRole={(roleId) => console.log('Delete role:', roleId)}
          />
        );

      // Управление заказами
      case 'all_orders':
        return (
          <AllOrdersSection
            orders={[]}
            loading={false}
            onViewOrder={(orderId) => console.log('View order:', orderId)}
            onEditOrder={(orderId) => console.log('Edit order:', orderId)}
            onChangeOrderStatus={(orderId, newStatus) => console.log('Change order status:', orderId, newStatus)}
            onAssignExpert={(orderId, expertId) => console.log('Assign expert:', orderId, expertId)}
            onContactClient={(orderId) => console.log('Contact client:', orderId)}
          />
        );
      
      case 'problem_orders':
        return (
          <ProblemOrdersSection
            orders={[]}
            loading={false}
            onViewOrder={(orderId) => console.log('View problem order:', orderId)}
            onResolveIssue={(orderId, resolution) => console.log('Resolve issue:', orderId, resolution)}
            onEscalateIssue={(orderId, escalationNote) => console.log('Escalate issue:', orderId, escalationNote)}
            onContactParticipant={(orderId, participantType) => console.log('Contact participant:', orderId, participantType)}
            onAssignNewExpert={(orderId, expertId) => console.log('Assign new expert:', orderId, expertId)}
          />
        );

      // Управление магазином
      case 'works_moderation':
        return (
          <WorksModerationSection
            works={[]}
            loading={false}
            onApproveWork={(workId, notes) => console.log('Approve work:', workId, notes)}
            onRejectWork={(workId, reason, notes) => console.log('Reject work:', workId, reason, notes)}
            onViewWork={(workId) => console.log('View work:', workId)}
            onDownloadWork={(workId) => console.log('Download work:', workId)}
          />
        );
      
      case 'categories_subjects':
        return (
          <CategoriesSubjectsSection
            subjects={[]}
            categories={[]}
            workTypes={[]}
            loading={false}
            onCreateSubject={(subjectData) => console.log('Create subject:', subjectData)}
            onUpdateSubject={(subjectId, subjectData) => console.log('Update subject:', subjectId, subjectData)}
            onDeleteSubject={(subjectId) => console.log('Delete subject:', subjectId)}
            onCreateCategory={(categoryData) => console.log('Create category:', categoryData)}
            onUpdateCategory={(categoryId, categoryData) => console.log('Update category:', categoryId, categoryData)}
            onDeleteCategory={(categoryId) => console.log('Delete category:', categoryId)}
            onCreateWorkType={(workTypeData) => console.log('Create work type:', workTypeData)}
            onUpdateWorkType={(workTypeId, workTypeData) => console.log('Update work type:', workTypeId, workTypeData)}
            onDeleteWorkType={(workTypeId) => console.log('Delete work type:', workTypeId)}
          />
        );

      // Новые секции поддержки
      case 'support_open':
      case 'support_in_progress':
      case 'support_completed':
        return (
          <SupportRequestsSection
            requests={supportData.requests}
            loading={supportData.loading}
            selectedStatus={selectedMenu.replace('support_', '') as SupportStatus}
            onStatusChange={(status) => supportData.handleStatusChange(status)}
            onRequestClick={supportData.handleRequestSelect}
            onTakeRequest={supportData.takeRequest}
          />
        );

      case 'admin_chats':
        return (
          <AdminChatsSection
            chatRooms={[]}
            currentUserId={1}
            loading={false}
            onSendMessage={(roomId, message, replyTo) => console.log('Send message:', roomId, message, replyTo)}
            onCreateRoom={(roomData) => console.log('Create room:', roomData)}
            onJoinRoom={(roomId) => console.log('Join room:', roomId)}
            onLeaveRoom={(roomId) => console.log('Leave room:', roomId)}
            onInviteUser={(roomId, userId) => console.log('Invite user:', roomId, userId)}
            onUploadFile={(roomId, file) => console.log('Upload file:', roomId, file)}
            onPinMessage={(messageId) => console.log('Pin message:', messageId)}
            onDeleteMessage={(messageId) => console.log('Delete message:', messageId)}
            onEditMessage={(messageId, newText) => console.log('Edit message:', messageId, newText)}
            onReactToMessage={(messageId, emoji) => console.log('React to message:', messageId, emoji)}
          />
        );
      
      // 🆕 Новые секции обработки запросов
      case 'request_processing_open':
        return (
          <OpenRequestsSection
            requests={[]}
            loading={false}
            onViewRequest={(requestId) => console.log('View request:', requestId)}
            onTakeRequest={(requestId) => console.log('Take request:', requestId)}
            onAssignRequest={(requestId, adminId) => console.log('Assign request:', requestId, adminId)}
            onSendResponse={(requestId, response, isAutoResponse) => console.log('Send response:', requestId, response, isAutoResponse)}
            onEscalateRequest={(requestId, reason) => console.log('Escalate request:', requestId, reason)}
            onCloseRequest={(requestId, reason) => console.log('Close request:', requestId, reason)}
            onAddTags={(requestId, tags) => console.log('Add tags:', requestId, tags)}
            onScheduleCall={(requestId, datetime) => console.log('Schedule call:', requestId, datetime)}
          />
        );

      case 'request_processing_progress':
        return (
          <InProgressRequestsSection
            requests={[]}
            loading={false}
            onViewRequest={(requestId) => console.log('View request:', requestId)}
            onUpdateProgress={(requestId, progress) => console.log('Update progress:', requestId, progress)}
            onSendResponse={(requestId, response) => console.log('Send response:', requestId, response)}
            onCompleteRequest={(requestId, resolution) => console.log('Complete request:', requestId, resolution)}
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
            requests={[]}
            loading={false}
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
            claims={[]}
            loading={false}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onTakeInWork={(claimId) => console.log('Take in work:', claimId)}
            onRejectClaim={(claimId, reason) => console.log('Reject claim:', claimId, reason)}
            onSendMessage={(claimId, message) => console.log('Send message:', claimId, message)}
          />
        );

      case 'in_progress_claims':
        return (
          <InProgressClaimsSection
            claims={[]}
            loading={false}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onCompleteClaim={(claimId, resolution) => console.log('Complete claim:', claimId, resolution)}
            onUpdateProgress={(claimId, progress) => console.log('Update progress:', claimId, progress)}
            onSendMessage={(claimId, message) => console.log('Send message:', claimId, message)}
          />
        );

      case 'completed_claims':
        return (
          <CompletedClaimsSection
            claims={[]}
            loading={false}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onReopenClaim={(claimId, reason) => console.log('Reopen claim:', claimId, reason)}
            onExportReport={(filters) => console.log('Export report:', filters)}
          />
        );

      case 'pending_approval':
        return (
          <PendingApprovalSection
            claims={[]}
            loading={false}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onApproveClaim={(claimId, decision) => console.log('Approve claim:', claimId, decision)}
            onRejectApproval={(claimId, reason) => console.log('Reject approval:', claimId, reason)}
            onEscalateToDirector={(claimId) => console.log('Escalate to director:', claimId)}
            onRequestMoreInfo={(claimId, questions) => console.log('Request more info:', claimId, questions)}
          />
        );

      case 'communication':
        return (
          <CommunicationSection
            messages={[]}
            currentUser={user}
            loading={false}
            onSendMessage={(messageData) => console.log('Send message to director:', messageData)}
            onReplyToMessage={(messageId, replyData) => console.log('Reply to message:', messageId, replyData)}
            onMarkAsRead={(messageId) => console.log('Mark as read:', messageId)}
            onArchiveMessage={(messageId) => console.log('Archive message:', messageId)}
            onUploadAttachment={async (file) => {
              console.log('Upload attachment:', file);
              return { id: 1, url: '/files/attachment.pdf' };
            }}
          />
        );

      case 'claims_processing':
        return (
          <ClaimsProcessingSection
            claims={[]}
            loading={false}
            onViewClaim={(claimId) => console.log('View claim:', claimId)}
            onAssignClaim={(claimId, adminId) => console.log('Assign claim:', claimId, adminId)}
            onUpdateStatus={(claimId, status, notes) => console.log('Update status:', claimId, status, notes)}
            onAddAction={(claimId, action) => console.log('Add action:', claimId, action)}
            onResolveClaim={(claimId, resolution) => console.log('Resolve claim:', claimId, resolution)}
            onSendMessage={(claimId, message, recipient) => console.log('Send message:', claimId, message, recipient)}
            onUploadEvidence={(claimId, file, type) => console.log('Upload evidence:', claimId, file, type)}
            onScheduleCall={(claimId, datetime, participants) => console.log('Schedule call:', claimId, datetime, participants)}
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
        request={supportData.selectedRequest}
        messages={supportData.requestMessages}
        isOpen={!!supportData.selectedRequest}
        onClose={supportData.handleRequestClose}
        onTakeRequest={supportData.takeRequest}
        onCompleteRequest={supportData.completeRequest}
        onSendMessage={supportData.sendMessage}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;