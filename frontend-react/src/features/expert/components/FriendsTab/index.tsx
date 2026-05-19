import React, { useState } from 'react';
import { Button, Typography, Avatar, Spin, Empty, Input, Segmented, message } from 'antd';
import { MessageOutlined, UserOutlined, UserAddOutlined, UserDeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type User } from '@/features/auth/api/auth';
import { getDisplayUsername } from '@/utils/formatters';
import styles from './FriendsTab.module.css';

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
  const [tab, setTab] = useState<string>('friends');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ['my-friends'],
    queryFn: () => authApi.getMyFriends(),
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users', search],
    queryFn: () => authApi.getAllUsers(search || undefined),
    enabled: tab === 'users',
  });

  const addFriendMutation = useMutation({
    mutationFn: (userId: number) => authApi.addFriend(userId),
    onSuccess: () => {
      message.success('Добавлен в друзья');
      queryClient.invalidateQueries({ queryKey: ['my-friends'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
    onError: () => message.error('Не удалось добавить в друзья'),
  });

  const removeFriendMutation = useMutation({
    mutationFn: (userId: number) => authApi.removeFriend(userId),
    onSuccess: () => {
      message.success('Удален из друзей');
      queryClient.invalidateQueries({ queryKey: ['my-friends'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    },
    onError: () => message.error('Не удалось удалить из друзей'),
  });

  const isLoading = tab === 'friends' ? friendsLoading : usersLoading;
  const users = tab === 'friends' ? (friends || []) : (allUsers || []);

  const filteredUsers = tab === 'friends' && search
    ? users.filter((u: User) => {
        const s = search.toLowerCase();
        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        return name.includes(s) || (u.username || '').toLowerCase().includes(s);
      })
    : users;

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>
          {tab === 'friends' ? 'Мои друзья' : 'Пользователи платформы'}
        </h2>
        <Segmented
          value={tab}
          onChange={(val) => setTab(val as string)}
          options={[
            { label: `Друзья${friends?.length ? ` (${friends.length})` : ''}`, value: 'friends' },
            { label: 'Все пользователи', value: 'users' },
          ]}
          style={{ marginBottom: 16 }}
        />
        <Input.Search
          placeholder="Поиск..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<SearchOutlined />}
          style={{ marginBottom: 16, maxWidth: 400 }}
        />
      </div>

      {isLoading ? (
        <div className={`${styles.sectionCard} ${styles.friendsLoadingCard}`}>
          <Spin size="large" />
          <Text className={styles.friendsLoadingText}>Загрузка...</Text>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Empty description={tab === 'friends' ? 'У вас пока нет друзей' : 'Пользователи не найдены'} />
      ) : (
        <div className={`${styles.friendsGrid} ${isMobile ? styles.friendsGridMobile : styles.friendsGridDesktop}`}>
          {filteredUsers.map((user: User & { is_friend?: boolean }) => (
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
                    : getDisplayUsername(user)}
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
                {user.is_friend || tab === 'friends' ? (
                  <Button
                    size={isMobile ? 'middle' : 'large'}
                    danger
                    icon={<UserDeleteOutlined />}
                    className={`${styles.friendProfileButton} ${isMobile ? styles.friendProfileButtonMobile : styles.friendProfileButtonDesktop}`}
                    onClick={() => removeFriendMutation.mutate(user.id)}
                    loading={removeFriendMutation.isPending}
                  >
                    {!isMobile && 'Удалить'}
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? 'middle' : 'large'}
                    type="default"
                    icon={<UserAddOutlined />}
                    className={`${styles.friendProfileButton} ${isMobile ? styles.friendProfileButtonMobile : styles.friendProfileButtonDesktop}`}
                    onClick={() => addFriendMutation.mutate(user.id)}
                    loading={addFriendMutation.isPending}
                  >
                    {!isMobile && 'В друзья'}
                  </Button>
                )}
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
      )}
    </div>
  );
};

export default FriendsTab;
