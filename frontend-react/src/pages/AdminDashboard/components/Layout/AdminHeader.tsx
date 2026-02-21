import React from 'react';
import { Layout, Typography, Button, Dropdown } from 'antd';
import { 
  LogoutOutlined, 
  MenuOutlined
} from '@ant-design/icons';
import { titleMap } from '../../constants';
import type { User } from '../../../../api/auth';
import type { MenuKey } from '../../types';
import styles from './AdminHeader.module.css';

const { Header } = Layout;
const { Title, Text } = Typography;

interface AdminHeaderProps {
  user: User;
  selectedMenu: MenuKey;
  onLogout: () => void;
  onMenuToggle?: () => void;
  isMobile?: boolean;
  isTablet?: boolean;
}


export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  selectedMenu,
  onLogout,
  onMenuToggle,
  isMobile = false,
  isTablet = false,
}) => {
  const currentTitle = titleMap[selectedMenu] || 'Личный кабинет администратора';

  
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: onLogout,
      danger: true,
    },
  ];

  return (
    <Header className={styles.header}>
      <div className={styles.leftSection}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuToggle}
            className={styles.menuButton}
          />
        )}

        <Title 
          level={isMobile ? 5 : 3} 
          className={styles.title}
        >
          {isMobile ? titleMap[selectedMenu]?.split(' ')[0] || 'Админ' : currentTitle}
        </Title>
      </div>

      <div className={styles.rightSection}>

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            type="text"
            className={styles.userButton}
          >
            <Text className={styles.username}>
              Администратор
            </Text>
          </Button>
        </Dropdown>

        {isMobile && (
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={onLogout}
            className={styles.logoutButton}
          />
        )}
      </div>
    </Header>
  );
};