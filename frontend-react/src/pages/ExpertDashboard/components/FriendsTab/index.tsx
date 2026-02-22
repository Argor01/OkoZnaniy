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


const getAvatarColorClass = (id: number) => styles[`friendAvatarColor${id % 7}`];

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
      <div className={`${styles.sectionCard} ${styles.friendsLoadingCard}`}>
        <Spin size="large" />
        <Text className={styles.friendsLoadingText}>Загрузка пользователей...</Text>
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
        <Text type="secondary" className={styles.friendsSubtitle}>
          Пользователи, которые недавно заходили на сайт
        </Text>
      </div>
      <div className={`${styles.friendsGrid} ${isMobile ? styles.friendsGridMobile : styles.friendsGridDesktop}`}>
        {recentUsers.map((user: User) => (
          <div 
            key={user.id} 
            className={`${styles.friendCard} ${isMobile ? styles.friendCardMobile : styles.friendCardDesktop}`}
          >
            <div className={styles.friendCardHeader}>
              <Avatar 
                size={isMobile ? 72 : 80} 
                src={user.avatar}
                className={`${styles.friendAvatar} ${getAvatarColorClass(user.id)} ${isMobile ? styles.friendAvatarMobile : styles.friendAvatarDesktop}`}
              >
                {!user.avatar && getInitials(user.first_name, user.last_name, user.username)}
              </Avatar>
              <Text strong className={`${styles.friendName} ${isMobile ? styles.friendNameMobile : styles.friendNameDesktop}`}>
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.username || 'Пользователь'}
              </Text>
              <Text type="secondary" className={`${styles.friendRole} ${isMobile ? styles.friendRoleMobile : styles.friendRoleDesktop}`}>
                {user.role === 'expert' ? 'Эксперт' : user.role === 'client' ? 'Клиент' : user.role}
              </Text>
              {user.bio && (
                <Text type="secondary" className={styles.friendBio}>
                  {user.bio.length > 50 ? `${user.bio.slice(0, 50)}...` : user.bio}
                </Text>
              )}
            </div>
            <div className={styles.friendActions}>
              <Button 
                type="primary" 
                size={isMobile ? 'middle' : 'large'}
                icon={<MessageOutlined />} 
                className={`${styles.friendMessageButton} ${isMobile ? styles.friendMessageButtonMobile : styles.friendMessageButtonDesktop}`}
                onClick={() => onOpenChat(user)}
              >
                Написать
              </Button>
              <Button 
                size={isMobile ? 'middle' : 'large'}
                icon={<UserOutlined />}
                className={`${styles.friendProfileButton} ${isMobile ? styles.friendProfileButtonMobile : styles.friendProfileButtonDesktop}`}
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
