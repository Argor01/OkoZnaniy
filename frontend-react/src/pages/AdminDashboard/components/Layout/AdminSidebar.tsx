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

  
  console.log('🔍 Menu items loaded:', menuItems.length, menuItems.map(i => i.label));
  console.log('🔍 Full menu structure:', JSON.stringify(menuItems, null, 2));

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