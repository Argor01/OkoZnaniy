import React from 'react';
import { Button, Typography, Avatar, Rate } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import styles from '../../ExpertDashboard.module.css';

const { Text } = Typography;

interface FriendsTabProps {
  isMobile: boolean;
  onOpenChat: (friend: any) => void;
  onOpenProfile: (friend: any) => void;
}

const mockFriends = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
    name: 'Дмитрий Новиков',
    specialization: 'История, Философия',
    rating: 4,
    worksCount: 74,
    avatar: 'ДН',
    avatarColor: '#ec4899',
    bio: 'Историк и философ. Помогаю студентам понять исторические процессы и философские концепции.',
    education: 'МГУ им. М.В. Ломоносова, Исторический факультет',
    experience: '6 лет',
    skills: ['История России', 'Всемирная история', 'Философия', 'Культурология']
  }
];

const FriendsTab: React.FC<FriendsTabProps> = ({ isMobile, onOpenChat, onOpenProfile }) => {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Мои друзья</h2>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: isMobile ? 12 : 16 
      }}>
        {mockFriends.map((friend) => (
          <div 
            key={friend.id} 
            style={{ 
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: isMobile ? 16 : 20,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#667eea';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
              <Avatar 
                size={isMobile ? 72 : 80} 
                style={{ 
                  backgroundColor: friend.avatarColor,
                  fontSize: isMobile ? 28 : 32,
                  fontWeight: 600,
                  marginBottom: 12,
                  border: '3px solid #fff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              >
                {friend.avatar}
              </Avatar>
              <Text strong style={{ fontSize: isMobile ? 16 : 18, display: 'block', marginBottom: 4, color: '#1f2937' }}>
                {friend.name}
              </Text>
              <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13, display: 'block', marginBottom: 8 }}>
                {friend.specialization}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Rate disabled defaultValue={friend.rating} style={{ fontSize: isMobile ? 14 : 16 }} />
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                  ({friend.worksCount})
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size={isMobile ? 'middle' : 'large'}
                icon={<MessageOutlined />} 
                style={{ 
                  flex: 1,
                  borderRadius: 10,
                  fontWeight: 500,
                  height: isMobile ? 36 : 40
                }}
                onClick={() => onOpenChat(friend)}
              >
                Написать
              </Button>
              <Button 
                size={isMobile ? 'middle' : 'large'}
                icon={<UserOutlined />}
                style={{
                  borderRadius: 10,
                  fontWeight: 500,
                  height: isMobile ? 36 : 40,
                  minWidth: isMobile ? 44 : 48
                }}
                onClick={() => onOpenProfile(friend)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsTab;
