import React, { Suspense, lazy } from 'react';
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
  useChatRoomActions,
  useArbitration
} from '@/features/admin/hooks';
import { User } from '@/features/auth/api/auth';
import { ROUTES } from '@/utils/constants';
import { AdminLayout } from '@/features/admin/components/Layout';
import type { MenuKey } from '@/features/admin/types';
import '@/styles/modals.css';
import '@/styles/admin-dashboard.css';

const OverviewSection = lazy(() => import('@/features/admin/components/Sections/OverviewSection').then(m => ({ default: m.OverviewSection })));
const PartnersSection = lazy(() => import('@/features/admin/components/Sections/PartnersSection').then(m => ({ default: m.PartnersSection })));
const EarningsSection = lazy(() => import('@/features/admin/components/Sections/EarningsSection').then(m => ({ default: m.EarningsSection })));

const TicketSystemSection = lazy(() => import('@/features/admin/components/Sections/TicketSystemSection').then(m => ({ default: m.TicketSystemSection })));
const ArbitrationSection = lazy(() => import('@/features/admin/components/Sections/ArbitrationSection').then(m => ({ default: m.ArbitrationSection })));
const UsersManagementSection = lazy(() => import('@/features/admin/components/Sections/UserRolesSection').then(m => ({ default: m.UsersManagementSection })));
const BlockedUsersSection = lazy(() => import('@/features/admin/components/Sections/BlockedUsersSection').then(m => ({ default: m.BlockedUsersSection })));
const RolesManagementSection = lazy(() => import('@/features/admin/components/Sections/UserRolesSection').then(m => ({ default: m.RolesManagementSection })));
const AllOrdersSection = lazy(() => import('@/features/admin/components/Sections/AllOrdersSection').then(m => ({ default: m.AllOrdersSection })));
const ProblemOrdersSection = lazy(() => import('@/features/admin/components/Sections/ProblemOrdersSection').then(m => ({ default: m.ProblemOrdersSection })));
const NewClaimsSection = lazy(() => import('@/features/admin/components/Sections/NewClaimsSection').then(m => ({ default: m.NewClaimsSection })));
const InProgressClaimsSection = lazy(() => import('@/features/admin/components/Sections/InProgressClaimsSection').then(m => ({ default: m.InProgressClaimsSection })));
const CompletedClaimsSection = lazy(() => import('@/features/admin/components/Sections/CompletedClaimsSection').then(m => ({ default: m.CompletedClaimsSection })));
const PendingApprovalSection = lazy(() => import('@/features/admin/components/Sections/PendingApprovalSection').then(m => ({ default: m.PendingApprovalSection })));
const AdminChatsSection = lazy(() => import('@/features/admin/components/Sections/AdminChatsSection').then(m => ({ default: m.AdminChatsSection })));
const UserConversationsSection = lazy(() => import('@/features/admin/components/Sections/UserConversationsSection').then(m => ({ default: m.UserConversationsSection })));
const TariffsSettingsSection = lazy(() => import('@/features/admin/components/Sections/TariffsSettingsSection').then(m => ({ default: m.TariffsSettingsSection })));

const PartnerModal = lazy(() => import('@/features/admin/components/Modals/PartnerModal').then(m => ({ default: m.PartnerModal })));
const DisputeModal = lazy(() => import('@/features/admin/components/Modals/DisputeModal').then(m => ({ default: m.DisputeModal })));
const SupportRequestModal = lazy(() => import('@/features/admin/components/Modals/SupportRequestModal').then(m => ({ default: m.SupportRequestModal })));

const { Content } = Layout;


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  
  const { 
    user, 
    loading, 
    isDirector,
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

  
  if (isDirector) {
    navigate(ROUTES.admin.directorDashboard);
    return null;
  }

  
  if (!user || user.role !== 'admin') {
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

  const { cases: arbitrationCases, stats: arbitrationStats, loading: arbitrationLoading, refetch: refetchArbitration } = useArbitration(selectedMenu === 'arbitration');

  
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

      
      case 'blocking':
        return (
          <BlockedUsersSection />
        );

      case 'user_roles':
        return (
          <RolesManagementSection />
        );

      
      case 'orders_management':
        return (
          <AllOrdersSection />
        );




      case 'tickets':
        return (
          <TicketSystemSection />
        );

      case 'arbitration':
        return (
          <ArbitrationSection
            cases={arbitrationCases}
            loading={arbitrationLoading}
            onRefresh={refetchArbitration}
            stats={arbitrationStats}
          />
        );

      case 'communication':
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
      <Suspense fallback={<div className="adminPageCenter"><Spin size="large" /></div>}>
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
      </Suspense>
    </AdminLayout>
  );
};

export default AdminDashboard;
