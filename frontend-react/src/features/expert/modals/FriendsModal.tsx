import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Input, Button, Avatar, Spin, Empty, Typography } from 'antd';
import { MessageOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
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
  const [screenSize, setScreenSize] = React.useState(() => {
    const width = window.innerWidth;
    if (width <= 360) return 'xs';
    if (width <= 480) return 'sm';
    if (width <= 600) return 'md';
    if (width <= 840) return 'lg';
    if (width <= 1024) return 'xl';
    return 'xxl';
  });

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 360) setScreenSize('xs');
      else if (width <= 480) setScreenSize('sm');
      else if (width <= 600) setScreenSize('md');
      else if (width <= 840) setScreenSize('lg');
      else if (width <= 1024) setScreenSize('xl');
      else setScreenSize('xxl');
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { data: recentUsers, isLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => authApi.getRecentUsers(),
    enabled: visible, 
  });

  const filteredUsers = useMemo(() => {
    if (!recentUsers) return [];
    if (!searchText) return recentUsers;
    
    const search = searchText.toLowerCase();
    return recentUsers.filter((user: User) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const username = (user.username || '').toLowerCase();
      const bio = (user.bio || '').toLowerCase();
      return fullName.includes(search) || username.includes(search) || bio.includes(search);
    });
  }, [recentUsers, searchText]);

  // Адаптивные размеры
  const modalConfig = useMemo(() => {
    switch (screenSize) {
      case 'xs':
        return { width: '100vw', avatarSize: 40, centered: false };
      case 'sm':
        return { width: '100vw', avatarSize: 48, centered: false };
      case 'md':
        return { width: '98vw', avatarSize: 52, centered: true };
      case 'lg':
        return { width: '95vw', avatarSize: 56, centered: true };
      case 'xl':
        return { width: '90vw', avatarSize: 60, centered: true };
      default:
        return { width: 800, avatarSize: 64, centered: true };
    }
  }, [screenSize]);

  const handleChatClick = useCallback((user: User) => {
    onOpenChat(user);
    onClose();
  }, [onOpenChat, onClose]);

  const handleProfileClick = useCallback((user: User) => {
    onOpenProfile(user);
    onClose();
  }, [onOpenProfile, onClose]);

  const getBioText = useCallback((bio: string) => {
    const maxLength = screenSize === 'xs' ? 30 : screenSize === 'sm' ? 40 : 60;
    return bio.length > maxLength ? `${bio.slice(0, maxLength)}...` : bio;
  }, [screenSize]);

  return (
    <Modal
      title={
        <div className={styles.friendsModalTitle}>
          Мои друзья
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={modalConfig.width}
      centered={modalConfig.centered}
      wrapClassName={styles.friendsModalWrap}
      destroyOnClose
      maskClosable={true}
    >
      <div className={styles.friendsModalContent}>
        <div className={styles.friendsModalSearchRow}>
          <Input.Search
            placeholder={screenSize === 'xs' || screenSize === 'sm' ? "Поиск..." : "Поиск пользователей..."}
            allowClear
            size={screenSize === 'xs' || screenSize === 'sm' ? 'middle' : 'large'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.friendsModalSearch}
            prefix={<SearchOutlined />}
          />
        </div>
        
        {isLoading ? (
          <div className={styles.friendsModalLoading}>
            <Spin size="large" />
            <Text className={styles.friendsModalLoadingText}>Загрузка пользователей...</Text>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.friendsModalEmpty}>
            <Empty 
              description={
                <Text className={styles.friendsModalEmptyText}>
                  {searchText ? "Пользователи не найдены" : "Пока нет активных пользователей"}
                </Text>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div className={styles.friendsModalGrid}>
            {filteredUsers.map((user: User) => (
              <div 
                key={user.id}
                className={styles.friendsModalCard}
              >
                <div className={styles.friendsModalCardHeader}>
                  <Avatar 
                    size={modalConfig.avatarSize} 
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
                        {getBioText(user.bio)}
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
                    onClick={() => handleChatClick(user)}
                  >
                    {screenSize === 'xs' ? '' : 'Написать'}
                  </Button>
                  <Button 
                    size="small" 
                    icon={<UserOutlined />}
                    className={styles.friendsModalActionButton}
                    onClick={() => handleProfileClick(user)}
                  >
                    {screenSize === 'xs' || screenSize === 'sm' ? '' : 'Профиль'}
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
