import React from 'react';
import { Layout, Spin, Alert, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  useAdminAuth, 
  useAdminData, 
  useAdminUI, 
  useAdminMutations,
  useClaims,
  useClaimActions,
  useAdminChatRooms,
  useChatRoomActions
} from '@/features/admin/hooks';
import { User } from '@/features/auth/api/auth';
import { ROUTES } from '@/utils/constants';
import { AdminLayout } from '@/features/admin/components/Layout';
import { 
  OverviewSection, 
  PartnersSection, 
  EarningsSection, 
  SupportChatsSection,
  TicketSystemSection,
  UsersManagementSection,
  BlockedUsersSection,
  RolesManagementSection,
  AllOrdersSection,
  ProblemOrdersSection,
  NewClaimsSection,
  InProgressClaimsSection,
  CompletedClaimsSection,
  PendingApprovalSection,
  AdminChatsSection,
  UserConversationsSection,
  TariffsSettingsSection,
} from '@/features/admin/components/Sections';
import { PartnerModal, DisputeModal, SupportRequestModal } from '@/features/admin/components/Modals';
import AdminLogin from '@/features/admin/pages/AdminLogin';
import type { MenuKey } from '@/features/admin/types';
import '@/styles/modals.css';
import '@/styles/admin-dashboard.css';

const { Content } = Layout;


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  
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

  
  if (loading) {
    return (
      <Layout className="adminPageLayout">
        <Content className="adminPageCenter">
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  
  if (!hasToken || !user) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  
  if (isDirector) {
    navigate(ROUTES.admin.directorDashboard);
    return null;
  }

  
  if (user.role !== 'admin') {
    return (
      <Layout className="adminPageLayout">
        <Content className="adminPageCenterPadded">
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

  
  return <AdminDashboardContent user={user} onLogout={handleLogout} />;
};


const AdminDashboardContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const adminData = useAdminData(true); 
  
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

  const { claims: newClaims, loading: newClaimsLoading } = useClaims('new', true);
  const { takeInWork } = useClaimActions();
  
  const { chatRooms, loading: chatRoomsLoading } = useAdminChatRooms(true);
  const { sendMessage: sendChatMessage, joinRoom, leaveRoom } = useChatRoomActions();

  
  const handleUpdatePartner = (partnerId: number, data: any) => {
    updatePartner({ partnerId, data });
    closePartnerModals();
  };

  const handleAssignArbitratorToDispute = (disputeId: number, arbitratorId: number) => {
    assignArbitrator({ disputeId, arbitratorId });
    closeDisputeModals();
  };

  
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
      
      case 'tariffs_settings':
        return (
          <TariffsSettingsSection />
        );

      
      case 'all_users':
        return (
          <UsersManagementSection />
        );
      
      case 'blocked_users':
        return (
          <BlockedUsersSection />
        );

      case 'user_roles':
        return (
          <RolesManagementSection />
        );

      
      case 'all_orders':
        return (
          <AllOrdersSection />
        );
      
      case 'problem_orders':
        return (
          <ProblemOrdersSection />
        );


      
      case 'support_chats':
        return (
          <SupportChatsSection />
        );

      case 'tickets':
        return (
          <TicketSystemSection />
        );

      case 'admin_chats':
        return (
          <AdminChatsSection />
        );
      
      
      case 'new_claims':
        return (
          <NewClaimsSection />
        );

      case 'in_progress_claims':
        return (
          <InProgressClaimsSection />
        );

      case 'completed_claims':
        return (
          <CompletedClaimsSection />
        );

      case 'pending_approval':
        return (
          <PendingApprovalSection />
        );

      case 'user_conversations':
        return (
          <UserConversationsSection />
        );
    }
  };

  
  return (
    <AdminLayout
      user={user}
      selectedMenu={selectedMenu}
      onMenuSelect={handleMenuClick}
      onLogout={onLogout}
    >
      {renderSection()}
      
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
          
          closeDisputeModals();
        }}
      />
      
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
