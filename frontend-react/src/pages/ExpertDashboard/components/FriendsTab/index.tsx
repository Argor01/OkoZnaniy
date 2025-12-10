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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {mockFriends.map((friend) => (
          <div key={friend.id} className={styles.orderCard} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={64} style={{ backgroundColor: friend.avatarColor }}>
                {friend.avatar}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 16, display: 'block' }}>{friend.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{friend.specialization}</Text>
                <div style={{ marginTop: 4 }}>
                  <Rate disabled defaultValue={friend.rating} style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {friend.worksCount} {friend.worksCount === 1 ? 'работа' : friend.worksCount < 5 ? 'работы' : 'работ'}
                  </Text>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<MessageOutlined />} 
                style={{ flex: 1 }}
                onClick={() => onOpenChat(friend)}
              >
                Написать
              </Button>
              <Button 
                size="small" 
                icon={<UserOutlined />}
                onClick={() => onOpenProfile(friend)}
              >
                Профиль
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsTab;
