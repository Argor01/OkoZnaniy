import React from 'react';
import { Layout, Spin, Alert, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth, useAdminData, useAdminUI, useAdminMutations } from './hooks';
import { AdminLayout } from './components/Layout';
import { 
  OverviewSection, 
  PartnersSection, 
  EarningsSection, 
  DisputesSection 
} from './components/Sections';
import { PartnerModal, DisputeModal } from './components/Modals';
import AdminLogin from '../../components/admin/AdminLogin';
import type { MenuKey } from './types';

const { Content } = Layout;

/**
 * Новый модульный AdminDashboard
 * 
 * Этот компонент заменяет монолитный AdminDashboard.tsx
 * Старый файл остается как резервная копия
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
    </AdminLayout>
  );
};

export default AdminDashboard;