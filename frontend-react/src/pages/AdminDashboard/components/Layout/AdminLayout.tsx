import React from 'react';
import { Layout } from 'antd';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminFooter } from './AdminFooter';
import { useAdminUI } from '../../hooks';
import type { User } from '../../../../api/auth';
import type { MenuKey } from '../../types';
import styles from './AdminLayout.module.css';

const { Content } = Layout;

interface AdminLayoutProps {
  user: User;
  selectedMenu: MenuKey;
  onMenuSelect: (key: MenuKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

/**
 * Основной лейаут админской панели
 * Включает сайдбар, хедер, контент и футер
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
  user,
  selectedMenu,
  onMenuSelect,
  onLogout,
  children,
}) => {
  const { 
    isMobile, 
    isTablet, 
    drawerVisible, 
    openDrawer, 
    closeDrawer,
    openKeys,
    setOpenKeys 
  } = useAdminUI();

  return (
    <Layout className={styles.adminLayout}>
      {/* Сайдбар для десктопа */}
      {!isMobile && (
        <AdminSidebar
          selectedMenu={selectedMenu}
          openKeys={openKeys}
          onMenuSelect={onMenuSelect}
          onOpenChange={setOpenKeys}
          isTablet={isTablet}
        />
      )}

      {/* Drawer для мобильных */}
      <AdminSidebar
        selectedMenu={selectedMenu}
        openKeys={openKeys}
        onMenuSelect={onMenuSelect}
        onOpenChange={setOpenKeys}
        isMobile={isMobile}
        drawerVisible={drawerVisible}
        onDrawerClose={closeDrawer}
      />

      <Layout className={styles.contentLayout}>
        {/* Хедер */}
        <AdminHeader
          user={user}
          selectedMenu={selectedMenu}
          onLogout={onLogout}
          onMenuToggle={openDrawer}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Основной контент */}
        <Content className={styles.content}>
          <div className={styles.contentInner}>
            {children}
          </div>
        </Content>

        {/* Футер */}
        {!isMobile && <AdminFooter />}
      </Layout>
    </Layout>
  );
};