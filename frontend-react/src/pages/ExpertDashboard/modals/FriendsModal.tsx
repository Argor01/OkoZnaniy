import React, { useState } from 'react';
import { Modal, Input, Button, Avatar, Spin, Empty, Typography } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '../../../api/auth';
import styles from '../ExpertDashboard.module.css';

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

  return (
    <Modal
      title={
        <div className={`${styles.friendsModalTitle} ${isMobile ? styles.friendsModalTitleMobile : styles.friendsModalTitleDesktop}`}>
          Последние пользователи
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 800}
      wrapClassName={`${styles.friendsModalWrap} ${isMobile ? styles.friendsModalWrapMobile : styles.friendsModalWrapDesktop}`}
    >
      <div className={`${styles.friendsModalContent} ${isMobile ? styles.friendsModalContentMobile : ''}`}>
        <div className={styles.friendsModalSearchRow}>
          <Input.Search
            placeholder={isMobile ? "Поиск..." : "Поиск пользователей..."}
            allowClear
            size={isMobile ? 'middle' : 'large'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`${styles.friendsModalSearch} ${isMobile ? styles.friendsModalSearchMobile : styles.friendsModalSearchDesktop}`}
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
          <div className={`${styles.friendsModalGrid} ${isMobile ? styles.friendsModalGridMobile : styles.friendsModalGridDesktop}`}>
            {filteredUsers.map((user: User) => (
              <div 
                key={user.id}
                className={`${styles.friendsModalCard} ${isMobile ? styles.friendsModalCardMobile : styles.friendsModalCardDesktop}`}
              >
                <div className={`${styles.friendsModalCardHeader} ${isMobile ? styles.friendsModalCardHeaderMobile : ''}`}>
                  <Avatar 
                    size={isMobile ? 48 : 56} 
                    src={user.avatar}
                    className={`${styles.friendsModalAvatar} ${avatarColorClasses[user.id % avatarColorClasses.length]}`}
                  >
                    {!user.avatar && getInitials(user.first_name, user.last_name, user.username)}
                  </Avatar>
                  <div className={styles.friendsModalCardInfo}>
                    <Text strong className={`${styles.friendsModalName} ${isMobile ? styles.friendsModalNameMobile : styles.friendsModalNameDesktop}`}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.username || 'Пользователь'}
                    </Text>
                    <Text type="secondary" className={`${styles.friendsModalRole} ${isMobile ? styles.friendsModalRoleMobile : styles.friendsModalRoleDesktop}`}>
                      {user.role === 'expert' ? 'Эксперт' : user.role === 'client' ? 'Клиент' : user.role}
                    </Text>
                    {user.bio && (
                      <Text type="secondary" className={`${styles.friendsModalBio} ${isMobile ? styles.friendsModalBioMobile : styles.friendsModalBioDesktop}`}>
                        {user.bio.length > 60 ? `${user.bio.slice(0, 60)}...` : user.bio}
                      </Text>
                    )}
                  </div>
                </div>
                <div className={`${styles.friendsModalActions} ${isMobile ? styles.friendsModalActionsMobile : styles.friendsModalActionsDesktop}`}>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<MessageOutlined />} 
                    className={`${styles.friendsModalActionButton} ${isMobile ? styles.friendsModalActionButtonMobile : styles.friendsModalActionButtonDesktop}`}
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
                    className={`${styles.friendsModalActionButton} ${isMobile ? styles.friendsModalActionButtonMobile : styles.friendsModalActionButtonDesktop}`}
                    onClick={() => {
                      onOpenProfile(user);
                      onClose();
                    }}
                  >
                    {!isMobile && 'Профиль'}
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
