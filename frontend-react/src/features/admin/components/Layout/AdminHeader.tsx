import React from 'react';
import { Layout, Typography, Button } from 'antd';
import { 
  LogoutOutlined, 
  MenuOutlined
} from '@ant-design/icons';
import { ThemeToggle } from '@/components/ui';
import { titleMap } from '@/features/admin/constants';
import type { User } from '@/features/auth/api/auth';
import type { MenuKey } from '@/features/admin/types';
import styles from './AdminHeader.module.css';

const { Header } = Layout;
const { Title } = Typography;

interface AdminHeaderProps {
  user?: User;
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
        <ThemeToggle size={isMobile ? 'small' : 'middle'} />

        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={onLogout}
          className={styles.logoutButton}
        />
      </div>
    </Header>
  );
};
