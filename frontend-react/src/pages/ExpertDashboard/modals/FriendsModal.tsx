import React, { useState } from 'react';
import { Modal, Input, Button, Avatar, Spin, Empty, Typography } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { authApi, type User } from '../../../api/auth';

const { Text } = Typography;

interface FriendsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onOpenChat: (friend: User) => void;
  onOpenProfile: (friend: User) => void;
}

// Цвета для аватаров
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
    enabled: visible, // Загружаем только когда модалка открыта
  });

  // Фильтрация по поиску
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
        <div style={{ 
          fontSize: isMobile ? 20 : 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: isMobile ? 4 : 8
        }}>
          Последние пользователи
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : 800}
      style={isMobile ? {
        top: 0,
        padding: 0,
        maxWidth: '100%',
        margin: 0
      } : {}}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: isMobile ? '16px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          height: isMobile ? '100vh' : 'auto'
        },
        body: {
          maxHeight: isMobile ? 'calc(100vh - 80px)' : '70vh',
          overflowY: 'auto',
          padding: '0'
        }
      }}
    >
      <div style={{ paddingTop: isMobile ? 12 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <Input.Search
            placeholder={isMobile ? "Поиск..." : "Поиск пользователей..."}
            allowClear
            size={isMobile ? 'middle' : 'large'}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ 
              marginBottom: isMobile ? 16 : 24,
              width: '100%'
            }}
            styles={{
              input: {
                fontSize: isMobile ? 14 : 16,
                lineHeight: isMobile ? '1.5' : 'normal',
                padding: isMobile ? '10px 11px' : undefined,
                height: isMobile ? '100%' : 'auto'
              },
              affixWrapper: {
                height: isMobile ? 44 : 'auto',
                alignItems: 'center'
              }
            }}
          />
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <Text style={{ display: 'block', marginTop: 16 }}>Загрузка пользователей...</Text>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Empty description={searchText ? "Пользователи не найдены" : "Пока нет активных пользователей"} />
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', 
            gap: isMobile ? 12 : 16, 
            alignItems: 'stretch' 
          }}>
            {filteredUsers.map((user: User) => (
              <div 
                key={user.id}
                style={{ 
                  background: '#ffffff',
                  borderRadius: isMobile ? 8 : 12,
                  border: '1px solid #e5e7eb',
                  padding: isMobile ? '12px' : '16px',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, flex: 1 }}>
                  <Avatar 
                    size={isMobile ? 48 : 56} 
                    src={user.avatar}
                    style={{ 
                      backgroundColor: getAvatarColor(user.id), 
                      flexShrink: 0 
                    }}
                  >
                    {!user.avatar && getInitials(user.first_name, user.last_name, user.username)}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: isMobile ? 15 : 16, display: 'block', lineHeight: '22px' }}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.username || 'Пользователь'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>
                      {user.role === 'expert' ? 'Эксперт' : user.role === 'client' ? 'Клиент' : user.role}
                    </Text>
                    {user.bio && (
                      <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block', marginTop: 4 }}>
                        {user.bio.length > 60 ? `${user.bio.slice(0, 60)}...` : user.bio}
                      </Text>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: isMobile ? 10 : 12, display: 'flex', gap: isMobile ? 6 : 8 }}>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<MessageOutlined />} 
                    style={{ flex: 1, fontSize: isMobile ? 12 : 14 }}
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
                    style={{ fontSize: isMobile ? 12 : 14 }}
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
