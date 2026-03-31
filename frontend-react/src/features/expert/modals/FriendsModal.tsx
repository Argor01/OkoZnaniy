import React, { useState } from 'react';
import { Modal, Input, Button, Avatar, Spin, Empty, Typography } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '@/features/auth/api/auth';
import styles from './FriendsModal.module.css';

const { Text } = Typography;

interface FriendsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onOpenChat: (friend: User) => void;
  onOpenProfile: (friend: User) => void;
}

const avatarColorClasses = [
  styles.friendsModalAvatarColor0,
  styles.friendsModalAvatarColor1,
  styles.friendsModalAvatarColor2,
  styles.friendsModalAvatarColor3,
  styles.friendsModalAvatarColor4,
  styles.friendsModalAvatarColor5,
  styles.friendsModalAvatarColor6
];

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

const FriendsModal: React.FC<FriendsModalProps> = ({ 
  visible, 
  onClose,
  isMobile,
  onOpenChat,
  onOpenProfile
}) => {
  const [searchText, setSearchText] = useState('');
  const [isTablet, setIsTablet] = React.useState(window.innerWidth <= 840 && window.innerWidth > 480);
  const [isSmallMobile, setIsSmallMobile] = React.useState(window.innerWidth <= 480);

  React.useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth <= 840 && window.innerWidth > 480);
      setIsSmallMobile(window.innerWidth <= 480);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { data: recentUsers, isLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => authApi.getRecentUsers(),
    enabled: visible, 
  });

  const filteredUsers = recentUsers?.filter((user: User) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const username = (user.username || '').toLowerCase();
    return fullName.includes(search) || username.includes(search);
  }) || [];

  // Адаптивные размеры
  const modalWidth = isSmallMobile ? '100vw' : isTablet ? '95vw' : isMobile ? '100%' : 800;
  const avatarSize = isSmallMobile ? 48 : isTablet ? 52 : 56;

  return (
    <Modal
      title={
        <div className={styles.friendsModalTitle}>
          Последние пользователи
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      centered={!isSmallMobile}
      wrapClassName={styles.friendsModalWrap}
      destroyOnClose
    >
      <div className={styles.friendsModalContent}>
        <div className={styles.friendsModalSearchRow}>
          <Input.Search
            placeholder={isSmallMobile ? "Поиск..." : "Поиск пользователей..."}
            allowClear
            size={isSmallMobile ? 'middle' : 'large'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.friendsModalSearch}
          />
        </div>
        
        {isLoading ? (
          <div className={styles.friendsModalLoading}>
            <Spin size="large" />
            <Text className={styles.friendsModalLoadingText}>Загрузка пользователей...</Text>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Empty description={searchText ? "Пользователи не найдены" : "Пока нет активных пользователей"} />
        ) : (
          <div className={styles.friendsModalGrid}>
            {filteredUsers.map((user: User) => (
              <div 
                key={user.id}
                className={styles.friendsModalCard}
              >
                <div className={styles.friendsModalCardHeader}>
                  <Avatar 
                    size={avatarSize} 
                    src={user.avatar}
                    className={`${styles.friendsModalAvatar} ${avatarColorClasses[user.id % avatarColorClasses.length]}`}
                  >
                    {!user.avatar && getInitials(user.first_name, user.last_name, user.username)}
                  </Avatar>
                  <div className={styles.friendsModalCardInfo}>
                    <Text strong className={styles.friendsModalName}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.username || 'Пользователь'}
                    </Text>
                    <Text type="secondary" className={styles.friendsModalRole}>
                      {user.role === 'expert' ? 'Эксперт' : user.role === 'client' ? 'Клиент' : user.role}
                    </Text>
                    {user.bio && (
                      <Text type="secondary" className={styles.friendsModalBio}>
                        {user.bio.length > (isSmallMobile ? 40 : 60) ? `${user.bio.slice(0, isSmallMobile ? 40 : 60)}...` : user.bio}
                      </Text>
                    )}
                  </div>
                </div>
                <div className={styles.friendsModalActions}>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<MessageOutlined />} 
                    className={styles.friendsModalActionButton}
                    onClick={() => {
                      onOpenChat(user);
                      onClose();
                    }}
                  >
                    Написать
                  </Button>
                  <Button 
                    size="small" 
                    icon={<UserOutlined />}
                    className={styles.friendsModalActionButton}
                    onClick={() => {
                      onOpenProfile(user);
                      onClose();
                    }}
                  >
                    {isSmallMobile ? '' : 'Профиль'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FriendsModal;
