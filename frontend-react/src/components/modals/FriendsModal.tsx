import React, { useState } from 'react';
import { Modal, Input, Button, Avatar, Rate, Typography } from 'antd';
import { 
  UserOutlined, 
  MessageOutlined, 
  SearchOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface Friend {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  avatarColor?: string;
  specialization: string;
  rating: number;
  worksCount: number;
  isOnline: boolean;
  lastSeen?: string;
  bio?: string;
  education?: string;
  experience?: string;
  skills?: string[];
  completedWorks?: number;
  successRate?: number;
}

interface FriendsModalProps {
  visible: boolean;
  onCancel: () => void;
  onMessageClick?: (friend: Friend) => void;
}

const FriendsModal: React.FC<FriendsModalProps> = ({
  visible,
  onCancel,
  onMessageClick
}) => {
  const [isMobile] = useState(window.innerWidth <= 840);
  const [isDesktop] = useState(window.innerWidth > 1024);

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
          Мои друзья
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width="auto"

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

          top: isMobile ? 0 : '60px',
          left: isMobile ? 0 : (isDesktop ? '280px' : '250px'),
          right: isMobile ? 0 : '20px',
          bottom: isMobile ? 0 : '20px',
          width: isMobile ? '100vw' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)'),
          height: isMobile ? '100vh' : 'calc(100vh - 80px)',
          transform: isMobile ? 'none' : 'none',
          position: 'fixed'
        },
        body: {
          height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 140px)',
          overflowY: 'auto',
          padding: '0',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <div style={{ padding: isMobile ? '12px' : '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Input.Search
          placeholder="Поиск друзей..."
          allowClear
          size={isMobile ? 'middle' : 'large'}
          style={{ marginBottom: isMobile ? 16 : 24 }}
          onSearch={(value) => {
            // Поиск по работам
          }}
        />
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: isMobile ? 12 : 16, 
          alignItems: 'stretch',
          flex: 1,
          overflowY: 'auto'
        }}>
          <div style={{ 
            background: '#ffffff',
            borderRadius: isMobile ? 8 : 12,
            border: '1px solid #e5e7eb',
            padding: isMobile ? '12px' : '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, flex: 1 }}>
              <Avatar size={isMobile ? 48 : 56} style={{ backgroundColor: '#3b82f6', flexShrink: 0 }}>ИП</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: isMobile ? 15 : 16, display: 'block', lineHeight: '22px' }}>Иван Петров</Text>
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>Математика, Физика</Text>
                <div style={{ marginTop: isMobile ? 4 : 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={5} style={{ fontSize: isMobile ? 11 : 12 }} />
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap' }}>127 работ</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: isMobile ? 10 : 12, display: 'flex', gap: isMobile ? 6 : 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1, fontSize: isMobile ? 12 : 14 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 1, 
                    name: 'Иван Петров', 
                    username: 'ivan_p',
                    specialization: 'Математика, Физика',
                    rating: 5,
                    worksCount: 127,
                    isOnline: true
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
                style={{ fontSize: isMobile ? 12 : 14 }}
              >
                {!isMobile && 'Профиль'}
              </Button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar size={56} style={{ backgroundColor: '#10b981', flexShrink: 0 }}>МС</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: '22px' }}>Мария Сидорова</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>Экономика, Бухучет</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>89 работ</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 2, 
                    name: 'Мария Сидорова', 
                    username: 'maria_s',
                    specialization: 'Экономика, Бухучет',
                    rating: 5,
                    worksCount: 89,
                    isOnline: false
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
              >
                Профиль
              </Button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar size={56} style={{ backgroundColor: '#f59e0b', flexShrink: 0 }}>АС</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: '22px' }}>Алексей Смирнов</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>Программирование</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>156 работ</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 3, 
                    name: 'Алексей Смирнов', 
                    username: 'alex_s',
                    specialization: 'Программирование',
                    rating: 4,
                    worksCount: 156,
                    isOnline: true
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
              >
                Профиль
              </Button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar size={56} style={{ backgroundColor: '#8b5cf6', flexShrink: 0 }}>ЕК</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: '22px' }}>Елена Козлова</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>Химия, Биология</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>203 работы</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 4, 
                    name: 'Елена Козлова', 
                    username: 'elena_k',
                    specialization: 'Химия, Биология',
                    rating: 5,
                    worksCount: 203,
                    isOnline: false
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
              >
                Профиль
              </Button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar size={56} style={{ backgroundColor: '#ec4899', flexShrink: 0 }}>ДН</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: '22px' }}>Дмитрий Новиков</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>История, Философия</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={4} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>74 работы</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 5, 
                    name: 'Дмитрий Новиков', 
                    username: 'dmitry_n',
                    specialization: 'История, Философия',
                    rating: 4,
                    worksCount: 74,
                    isOnline: false
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
              >
                Профиль
              </Button>
            </div>
          </div>

          <div style={{ 
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '16px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
              <Avatar size={56} style={{ backgroundColor: '#06b6d4', flexShrink: 0 }}>ОВ</Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: '22px' }}>Ольга Васильева</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>Английский язык</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <Rate disabled defaultValue={5} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>312 работ</Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => {
                  onMessageClick?.({ 
                    id: 6, 
                    name: 'Ольга Васильева', 
                    username: 'olga_v',
                    specialization: 'Английский язык',
                    rating: 5,
                    worksCount: 312,
                    isOnline: true
                  });
                }}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
              >
                Профиль
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FriendsModal;