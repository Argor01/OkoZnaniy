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

const { Text } = Typography;

interface FriendProfileModalProps {
  visible: boolean;
  onClose: () => void;
  friend: any;
  onOpenChat: () => void;
  isMobile: boolean;
}

const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  visible,
  onClose,
  friend,
  onOpenChat,
  isMobile
}) => {
  if (!friend) return null;

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: 24, 
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        },
        body: {
          padding: 0
        }
      }}
    >
      <div>
        {/* Header with gradient background */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px 32px',
          position: 'relative'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 20 
          }}>
            <Avatar 
              size={100} 
              style={{ 
                backgroundColor: friend.avatarColor,
                fontSize: 36,
                fontWeight: 600,
                border: '4px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {friend.avatar}
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  fontSize: 28, 
                  display: 'block',
                  color: '#ffffff',
                  marginBottom: 8
                }}
              >
                {friend.name}
              </Text>
              <Text 
                style={{ 
                  fontSize: 16, 
                  color: 'rgba(255, 255, 255, 0.9)',
                  display: 'block',
                  marginBottom: 12
                }}
              >
                {friend.specialization}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <Rate 
                    disabled 
                    defaultValue={friend.rating} 
                    style={{ fontSize: 16, color: '#fbbf24' }} 
                  />
                </div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
                  {friend.worksCount} работ
                </Text>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          {/* Bio Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 12
            }}>
              <UserOutlined style={{ fontSize: 20, color: '#667eea' }} />
              <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                О себе
              </Text>
            </div>
            <Text style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6 }}>
              {friend.bio}
            </Text>
          </div>

          {/* Education Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 12
            }}>
              <TrophyOutlined style={{ fontSize: 20, color: '#667eea' }} />
              <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                Образование
              </Text>
            </div>
            <Text style={{ fontSize: 15, color: '#4b5563' }}>
              {friend.education}
            </Text>
          </div>

          {/* Experience Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 12
            }}>
              <ClockCircleOutlined style={{ fontSize: 20, color: '#667eea' }} />
              <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                Опыт работы
              </Text>
            </div>
            <Text style={{ fontSize: 15, color: '#4b5563' }}>
              {friend.experience}
            </Text>
          </div>

          {/* Skills Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 12
            }}>
              <StarFilled style={{ fontSize: 20, color: '#667eea' }} />
              <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                Навыки
              </Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {friend.skills?.map((skill: string, index: number) => (
                <Tag 
                  key={index}
                  style={{ 
                    padding: '6px 16px',
                    fontSize: 14,
                    borderRadius: 20,
                    border: '1px solid #e0e7ff',
                    background: '#f5f7ff',
                    color: '#667eea'
                  }}
                >
                  {skill}
                </Tag>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: 12,
            paddingTop: 24,
            borderTop: '1px solid #e5e7eb'
          }}>
            <Button 
              type="primary" 
              size="large"
              icon={<MessageOutlined />}
              style={{ 
                flex: 1,
                height: 48,
                borderRadius: 12,
                fontSize: 16
              }}
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
              style={{ 
                height: 48,
                borderRadius: 12,
                fontSize: 16
              }}
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
