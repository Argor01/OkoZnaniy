import React from 'react';
import { Modal, Avatar, Typography, Button, Tag, Rate } from 'antd';
import { 
  MessageOutlined, 
  HeartOutlined, 
  UserOutlined, 
  TrophyOutlined, 
  ClockCircleOutlined, 
  StarFilled 
} from '@ant-design/icons';
import type { User } from '../../../api/auth';
import styles from '../ExpertDashboard.module.css';

const { Text } = Typography;

interface FriendProfileModalProps {
  visible: boolean;
  onClose: () => void;
  friend: User | null;
  onOpenChat: () => void;
}

const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const avatarColorClasses = [
  styles.friendProfileAvatarColor0,
  styles.friendProfileAvatarColor1,
  styles.friendProfileAvatarColor2,
  styles.friendProfileAvatarColor3,
  styles.friendProfileAvatarColor4,
  styles.friendProfileAvatarColor5,
  styles.friendProfileAvatarColor6,
];

const getInitials = (firstName?: string, lastName?: string, username?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return 'U';
};

const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  visible,
  onClose,
  friend,
  onOpenChat,
}) => {
  if (!friend) return null;

  const name =
    (friend.first_name || friend.last_name)
      ? [friend.first_name, friend.last_name].filter(Boolean).join(' ')
      : friend.username || 'Пользователь';

  const skills = typeof friend.skills === 'string'
    ? friend.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      wrapClassName={styles.friendProfileModalWrap}
    >
      <div>
        <div className={styles.friendProfileHeader}>
          <div className={styles.friendProfileHeaderRow}>
            <Avatar 
              size={100} 
              src={friend.avatar || undefined}
              className={`${styles.friendProfileAvatar} ${avatarColorClasses[friend.id % avatarColorClasses.length]}`}
            >
              {!friend.avatar && getInitials(friend.first_name, friend.last_name, friend.username)}
            </Avatar>
            <div className={styles.friendProfileHeaderInfo}>
              <Text 
                strong 
                className={styles.friendProfileName}
              >
                {name}
              </Text>
              <Text 
                className={styles.friendProfileRole}
              >
                {friend.role === 'expert' ? 'Эксперт' : friend.role === 'client' ? 'Клиент' : friend.role}
              </Text>
              <div className={styles.friendProfileRatingRow}>
                <Rate disabled defaultValue={0} className={styles.friendProfileRating} />
              </div>
            </div>
          </div>
        </div>

        
        <div className={styles.friendProfileContent}>
          
          <div className={styles.friendProfileSection}>
            <div className={styles.friendProfileSectionHeader}>
              <UserOutlined className={styles.friendProfileSectionIcon} />
              <Text strong className={styles.friendProfileSectionTitle}>
                О себе
              </Text>
            </div>
            <Text className={styles.friendProfileSectionText}>
              {friend.bio}
            </Text>
          </div>

          <div className={styles.friendProfileSection}>
            <div className={styles.friendProfileSectionHeader}>
              <TrophyOutlined className={styles.friendProfileSectionIcon} />
              <Text strong className={styles.friendProfileSectionTitle}>
                Образование
              </Text>
            </div>
            <Text className={styles.friendProfileSectionText}>
              {friend.education}
            </Text>
          </div>

          <div className={styles.friendProfileSection}>
            <div className={styles.friendProfileSectionHeader}>
              <ClockCircleOutlined className={styles.friendProfileSectionIcon} />
              <Text strong className={styles.friendProfileSectionTitle}>
                Опыт работы
              </Text>
            </div>
            <Text className={styles.friendProfileSectionText}>
              {typeof friend.experience_years === 'number' ? `${friend.experience_years} лет` : ''}
            </Text>
          </div>

          <div className={styles.friendProfileSection}>
            <div className={styles.friendProfileSectionHeader}>
              <StarFilled className={styles.friendProfileSectionIcon} />
              <Text strong className={styles.friendProfileSectionTitle}>
                Навыки
              </Text>
            </div>
            <div className={styles.friendProfileTags}>
              {skills.map((skill: string, index: number) => (
                <Tag 
                  key={index}
                  className={styles.friendProfileTag}
                >
                  {skill}
                </Tag>
              ))}
            </div>
          </div>

          
          <div className={styles.friendProfileActions}>
            <Button 
              type="primary" 
              size="large"
              icon={<MessageOutlined />}
              className={styles.friendProfilePrimaryButton}
              onClick={() => {
                onClose();
                onOpenChat();
              }}
            >
              Написать сообщение
            </Button>
            <Button 
              size="large"
              icon={<HeartOutlined />}
              className={styles.friendProfileSecondaryButton}
            >
              В избранное
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FriendProfileModal;
