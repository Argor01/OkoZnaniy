import React from 'react';
import { Layout, Menu, Typography, Drawer } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { menuItems, titleMap } from '../../constants';
import type { MenuKey } from '../../types';
import styles from './AdminSidebar.module.css';

const { Sider } = Layout;
const { Title } = Typography;

interface AdminSidebarProps {
  selectedMenu: MenuKey;
  openKeys: string[];
  onMenuSelect: (key: MenuKey) => void;
  onOpenChange: (keys: string[]) => void;
  isTablet?: boolean;
  isMobile?: boolean;
  drawerVisible?: boolean;
  onDrawerClose?: () => void;
}

/**
 * Боковая панель админской панели
 * Поддерживает как обычный сайдбар, так и drawer для мобильных
 */
export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  selectedMenu,
  openKeys,
  onMenuSelect,
  onOpenChange,
  isTablet = false,
  isMobile = false,
  drawerVisible = false,
  onDrawerClose,
}) => {
  // Преобразуем menuItems для Ant Design Menu
  const antMenuItems = menuItems.map(item => ({
    key: item.key,
    icon: React.createElement(item.icon),
    label: item.label,
    children: item.children?.map(child => ({
      key: child.key,
      icon: React.createElement(child.icon),
      label: child.label,
    })),
  }));

  const handleMenuClick = ({ key }: { key: string }) => {
    onMenuSelect(key as MenuKey);
  };

  const renderMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[selectedMenu]}
      openKeys={openKeys}
      onClick={handleMenuClick}
      onOpenChange={onOpenChange}
      className={styles.menu}
      items={antMenuItems}
    />
  );

  const renderHeader = () => (
    <div className={`${styles.header} ${isTablet ? styles.headerTablet : ''}`}>
      <SettingOutlined className={styles.icon} />
      <Title level={4} className={styles.title}>
        ЛК администратора
      </Title>
    </div>
  );

  // Для мобильных устройств используем Drawer
  if (isMobile) {
    return (
      <Drawer
        title="Меню"
        placement="left"
        onClose={onDrawerClose}
        open={drawerVisible}
        width={280}
        className={styles.drawer}
        styles={{ body: { padding: 0 } }}
      >
        {renderHeader()}
        {renderMenu()}
      </Drawer>
    );
  }

  // Для десктопа и планшета используем обычный Sider
  return (
    <Sider
      width={isTablet ? 200 : 250}
      className={styles.sider}
      breakpoint="lg"
      collapsedWidth="0"
    >
      {renderHeader()}
      <div className={styles.menuContainer}>
        {renderMenu()}
      </div>
    </Sider>
  );
};