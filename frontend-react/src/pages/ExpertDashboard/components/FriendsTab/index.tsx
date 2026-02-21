import React from 'react';
import { Button, Typography, Avatar, Rate, Spin, Empty } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '../../../../api/auth';
import styles from '../../ExpertDashboard.module.css';

const { Text } = Typography;

interface FriendsTabProps {
  isMobile: boolean;
  onOpenChat: (friend: User) => void;
  onOpenProfile: (friend: User) => void;
}


const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const FriendsTab: React.FC<FriendsTabProps> = ({ isMobile, onOpenChat, onOpenProfile }) => {
  const { data: recentUsers, isLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => authApi.getRecentUsers(),
  });

  if (isLoading) {
    return (
      <div className={styles.sectionCard} style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <Text style={{ display: 'block', marginTop: 16 }}>Загрузка пользователей...</Text>
      </div>
    );
  }

  if (!recentUsers || recentUsers.length === 0) {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader}>
          <h2 className={styles.sectionTitle}>Последние пользователи</h2>
        </div>
        <Empty description="Пока нет активных пользователей" />
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Последние пользователи</h2>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Пользователи, которые недавно заходили на сайт
        </Text>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: isMobile ? 12 : 16 
      }}>
        {recentUsers.map((user: User) => (
          <div 
            key={user.id} 
            style={{ 
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: isMobile ? 16 : 20,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
              <Avatar 
                size={isMobile ? 72 : 80} 
                src={user.avatar}
                style={{ 
                  backgroundColor: getAvatarColor(user.id),
                  fontSize: isMobile ? 28 : 32,
                  fontWeight: 600,
                  marginBottom: 12,
                  border: '3px solid #fff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                {!user.avatar && getInitials(user.first_name, user.last_name, user.username)}
              </Avatar>
              <Text strong style={{ fontSize: isMobile ? 16 : 18, display: 'block', marginBottom: 4, color: '#1f2937' }}>
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.username || 'Пользователь'}
              </Text>
              <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13, display: 'block', marginBottom: 8 }}>
                {user.role === 'expert' ? 'Эксперт' : user.role === 'client' ? 'Клиент' : user.role}
              </Text>
              {user.bio && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {user.bio.length > 50 ? `${user.bio.slice(0, 50)}...` : user.bio}
                </Text>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size={isMobile ? 'middle' : 'large'}
                icon={<MessageOutlined />} 
                style={{ 
                  flex: 1,
                  borderRadius: 10,
                  fontWeight: 500,
                  height: isMobile ? 36 : 40
                }}
                onClick={() => onOpenChat(user)}
              >
                Написать
              </Button>
              <Button 
                size={isMobile ? 'middle' : 'large'}
                icon={<UserOutlined />}
                style={{
                  borderRadius: 10,
                  fontWeight: 500,
                  height: isMobile ? 36 : 40,
                  minWidth: isMobile ? 44 : 48
                }}
                onClick={() => onOpenProfile(user)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsTab;
