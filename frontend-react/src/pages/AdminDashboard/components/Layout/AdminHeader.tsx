import React from 'react';
import { Layout, Typography, Button, Space, Avatar, Dropdown } from 'antd';
import { 
  LogoutOutlined, 
  MenuOutlined, 
  UserOutlined,
  SettingOutlined 
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

/**
 * Шапка админской панели
 * Содержит заголовок, информацию о пользователе и кнопку выхода
 */
export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  selectedMenu,
  onLogout,
  onMenuToggle,
  isMobile = false,
  isTablet = false,
}) => {
  const currentTitle = titleMap[selectedMenu] || 'Личный кабинет администратора';

  // Меню пользователя для dropdown
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      onClick: () => {
        // TODO: Открыть профиль пользователя
      },
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      onClick: () => {
        // TODO: Открыть настройки
      },
    },
    {
      type: 'divider' as const,
    },
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
        {/* Кнопка меню для мобильных */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuToggle}
            className={styles.menuButton}
          />
        )}

        {/* Заголовок */}
        <Title 
          level={isMobile ? 5 : 3} 
          className={styles.title}
        >
          {isMobile ? titleMap[selectedMenu]?.split(' ')[0] || 'Админ' : currentTitle}
        </Title>
      </div>

      <div className={styles.rightSection}>
        {/* Информация о пользователе */}
        {!isMobile && (
          <Space className={styles.userInfo}>
            <Text type="secondary">Добро пожаловать,</Text>
            <Text strong>{user.first_name || user.username}</Text>
          </Space>
        )}

        {/* Dropdown с меню пользователя */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            type="text"
            className={styles.userButton}
          >
            <Space>
              <Avatar 
                size={isMobile ? 'small' : 'default'}
                icon={<UserOutlined />}
                className={styles.avatar}
              />
              {!isMobile && (
                <Text className={styles.username}>
                  {user.first_name || user.username}
                </Text>
              )}
            </Space>
          </Button>
        </Dropdown>

        {/* Кнопка выхода (для мобильных как отдельная кнопка) */}
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