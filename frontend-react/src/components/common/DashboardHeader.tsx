import React from 'react';
import { Badge, Button, Dropdown, Layout, Menu, Space, Tooltip, Typography, message } from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  WalletOutlined,
  LogoutOutlined,
  MenuOutlined,
  UnorderedListOutlined,
  ShopOutlined,
  FileDoneOutlined,
  PlusOutlined,
  CustomerServiceOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';
import { formatCurrency } from '../../utils/formatters';

const { Header } = Layout;
const { Text } = Typography;

interface DashboardHeaderProps {
  userProfile?: {
    username: string;
    avatar?: string;
    role: string;
    balance?: number;
  };
  unreadMessages?: number;
  unreadNotifications?: number;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  onSupportClick?: () => void;
  onBalanceClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userProfile,
  unreadMessages = 0,
  unreadNotifications = 0,
  onMessagesClick,
  onNotificationsClick,
  onSupportClick,
  onBalanceClick,
  onProfileClick,
  onLogout,
  onMenuClick,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawBalance = userProfile?.balance;
  const balance = rawBalance ? Number(rawBalance) : 0;
  const isExpert = userProfile?.role === 'expert';
  const isClient = userProfile?.role === 'client';

  const navItems: MenuProps['items'] = [
    {
      key: '/orders-feed',
      label: 'Лента заказов',
      icon: <UnorderedListOutlined />,
    },
  ];

  if (isExpert) {
    navItems.push({
      key: '/works',
      label: 'Мои заказы',
      icon: <FileDoneOutlined />,
    });
    navItems.push({
      key: 'shop-menu',
      label: 'Магазин',
      icon: <ShopOutlined />,
      children: [
        {
          key: '/shop/ready-works',
          label: 'Магазин готовых работ',
        },
        {
          key: '/shop/add-work',
          label: 'Добавить работу',
        },
        {
          key: '/shop/purchased',
          label: 'Купленные работы',
        },
      ],
    });
  } else if (isClient) {
    navItems.push({
      key: '/create-order',
      label: 'Создать заказ',
      icon: <PlusOutlined />,
    });
    navItems.push({
      key: '/shop/ready-works',
      label: 'Магазин работ',
      icon: <ShopOutlined />,
    });
    navItems.push({
      key: '/shop/purchased',
      label: 'Купленные работы',
      icon: <FileDoneOutlined />,
    });
  }

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Редактировать профиль',
      icon: <UserOutlined />,
      onClick: onProfileClick,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <Header className={styles.dashboardHeader}>
      <div className={styles.headerLeft}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuClick}
            className={styles.menuButton}
          />
        )}
        {!isMobile && (
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={navItems}
            className={styles.navMenu}
            onClick={({ key }) => {
              if (key !== 'shop-menu') {
                navigate(key);
              }
            }}
          />
        )}
      </div>

      <div className={styles.headerRight}>
        <Space size={isMobile ? 8 : 16}>
          <Button
            type="text"
            icon={<WalletOutlined style={{ color: 'white' }} />}
            onClick={onBalanceClick}
            className={`${styles.balanceButton} balanceButton`}
            style={{ color: 'white' }}
          >
            {!isMobile && (
              <Text className={`${styles.balanceText} balanceText`} style={{ color: 'white' }}>
                {formatCurrency(balance)}
              </Text>
            )}
          </Button>

          <Badge count={unreadMessages} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={onMessagesClick}
              className={styles.iconButton}
            />
          </Badge>

          
          <Badge count={unreadNotifications} offset={[-5, 5]}>
            <Button
              type="text"
              icon={<BellOutlined />}
              onClick={onNotificationsClick}
              className={styles.iconButton}
            />
          </Badge>

          
          <Dropdown
            menu={{
              items: [
                {
                  key: 'support-info',
                  label: (
                    <div style={{ padding: '8px 4px', minWidth: 280 }}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
                          Служба поддержки
                        </Text>
                        
                        
                        <div 
                          style={{ 
                            marginBottom: 8, 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#f9fafb',
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('88005007857');
                            message.success('Телефон скопирован!');
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                          }}
                        >
                          <PhoneOutlined style={{ fontSize: 16, color: '#10b981', marginRight: 10 }} />
                          <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                            8 (800) 500-78-57
                          </Text>
                          <CopyOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                        </div>
                        
                        
                        <div 
                          style={{ 
                            marginBottom: 8, 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#f9fafb',
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('b-oko.znaniy@mail.ru');
                            message.success('Email скопирован!');
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                          }}
                        >
                          <MailOutlined style={{ fontSize: 16, color: '#3b82f6', marginRight: 10 }} />
                          <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                            b-oko.znaniy@mail.ru
                          </Text>
                          <CopyOutlined style={{ fontSize: 12, color: '#9ca3af' }} />
                        </div>
                      </div>
                      
                      
                      <div style={{ 
                        marginBottom: 4, 
                        paddingTop: 12, 
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 12px 4px 12px',
                      }}>
                        <ClockCircleOutlined style={{ fontSize: 14, color: '#f59e0b', marginRight: 8 }} />
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                            График работы
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Пн-Пт 07:00 - 16:00 (МСК)
                          </Text>
                        </div>
                      </div>
                    </div>
                  ),
                  disabled: true,
                },
                {
                  type: 'divider',
                },
                {
                  key: 'write-to-support',
                  label: 'Написать нам',
                  icon: <MessageOutlined />,
                  onClick: onSupportClick,
                },
              ],
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<CustomerServiceOutlined />}
              className={styles.iconButton}
            />
          </Dropdown>

          
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight">
            <div className={styles.profileSection}>
              {!isMobile && (
                <Text className={styles.username}>
                  {userProfile?.username || 'Пользователь'}
                </Text>
              )}
            </div>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default DashboardHeader;
