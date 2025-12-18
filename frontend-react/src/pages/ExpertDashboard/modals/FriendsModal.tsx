import React from 'react';
import { Modal, Input, Button, Avatar, Rate, Typography } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Friend {
  name: string;
  specialization: string;
  rating: number;
  worksCount: number;
  avatar: string;
  avatarColor: string;
  bio?: string;
  education?: string;
  experience?: string;
  skills?: string[];
}

interface FriendsModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  onOpenChat: (friend: Friend) => void;
  onOpenProfile: (friend: Friend) => void;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ 
  visible, 
  onClose,
  isMobile,
  onOpenChat,
  onOpenProfile
}) => {
  const friends: Friend[] = [
    {
      name: 'Иван Петров',
      specialization: 'Математика, Физика',
      rating: 5,
      worksCount: 127,
      avatar: 'ИП',
      avatarColor: '#3b82f6',
      bio: 'Опытный преподаватель математики и физики с 10-летним стажем. Специализируюсь на подготовке к ЕГЭ и олимпиадам.',
      education: 'МГУ им. М.В. Ломоносова, Механико-математический факультет',
      experience: '10 лет',
      skills: ['Высшая математика', 'Физика', 'Подготовка к ЕГЭ', 'Олимпиадная математика']
    },
    {
      name: 'Мария Сидорова',
      specialization: 'Экономика, Бухучет',
      rating: 5,
      worksCount: 89,
      avatar: 'МС',
      avatarColor: '#10b981',
      bio: 'Экономист с опытом работы в крупных компаниях. Помогаю студентам разобраться в сложных экономических концепциях.',
      education: 'РЭУ им. Г.В. Плеханова, Экономический факультет',
      experience: '7 лет',
      skills: ['Микроэкономика', 'Макроэкономика', 'Бухгалтерский учет', 'Финансовый анализ']
    },
    {
      name: 'Алексей Смирнов',
      specialization: 'Программирование',
      rating: 4,
      worksCount: 156,
      avatar: 'АС',
      avatarColor: '#f59e0b',
      bio: 'Разработчик с опытом в веб-разработке и мобильных приложениях. Помогаю студентам освоить программирование с нуля.',
      education: 'МФТИ, Факультет инноваций и высоких технологий',
      experience: '8 лет',
      skills: ['Python', 'JavaScript', 'React', 'Node.js', 'Алгоритмы']
    },
    {
      name: 'Елена Козлова',
      specialization: 'Химия, Биология',
      rating: 5,
      worksCount: 203,
      avatar: 'ЕК',
      avatarColor: '#8b5cf6',
      bio: 'Кандидат химических наук. Специализируюсь на органической химии и биохимии. Готовлю к ЕГЭ и вступительным экзаменам.',
      education: 'МГУ им. М.В. Ломоносова, Химический факультет',
      experience: '12 лет',
      skills: ['Органическая химия', 'Неорганическая химия', 'Биология', 'Биохимия']
    },
    {
      name: 'Дмитрий Новиков',
      specialization: 'История, Философия',
      rating: 4,
      worksCount: 74,
      avatar: 'ДН',
      avatarColor: '#ec4899',
      bio: 'Историк и философ. Помогаю понять сложные исторические процессы и философские концепции.',
      education: 'СПбГУ, Исторический факультет',
      experience: '6 лет',
      skills: ['История России', 'Всемирная история', 'Философия', 'Обществознание']
    },
    {
      name: 'Ольга Васильева',
      specialization: 'Английский язык',
      rating: 5,
      worksCount: 312,
      avatar: 'ОВ',
      avatarColor: '#06b6d4',
      bio: 'Преподаватель английского языка с международными сертификатами. Готовлю к IELTS, TOEFL и ЕГЭ.',
      education: 'МГЛУ, Факультет английского языка',
      experience: '15 лет',
      skills: ['Английский язык', 'IELTS', 'TOEFL', 'Деловой английский', 'Разговорная практика']
    }
  ];

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
            placeholder={isMobile ? "Поиск..." : "Поиск друзей..."}
            allowClear
            size={isMobile ? 'middle' : 'large'}
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
            onSearch={(value) => {
              // Поиск по друзьям
            }}
          />
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: isMobile ? 12 : 16, 
          alignItems: 'stretch' 
        }}>
          {friends.map((friend, index) => (
            <div 
              key={index}
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
                  style={{ backgroundColor: friend.avatarColor, flexShrink: 0 }}
                >
                  {friend.avatar}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: isMobile ? 15 : 16, display: 'block', lineHeight: '22px' }}>
                    {friend.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block', lineHeight: '18px', marginTop: 2 }}>
                    {friend.specialization}
                  </Text>
                  <div style={{ marginTop: isMobile ? 4 : 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <Rate disabled defaultValue={friend.rating} style={{ fontSize: isMobile ? 11 : 12 }} />
                    <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap' }}>
                      {friend.worksCount} {friend.worksCount === 1 ? 'работа' : friend.worksCount < 5 ? 'работы' : 'работ'}
                    </Text>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: isMobile ? 10 : 12, display: 'flex', gap: isMobile ? 6 : 8 }}>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<MessageOutlined />} 
                  style={{ flex: 1, fontSize: isMobile ? 12 : 14 }}
                  onClick={() => onOpenChat(friend)}
                >
                  Написать
                </Button>
                <Button 
                  size="small" 
                  icon={<UserOutlined />}
                  style={{ fontSize: isMobile ? 12 : 14 }}
                  onClick={() => onOpenProfile(friend)}
                >
                  {!isMobile && 'Профиль'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default FriendsModal;
