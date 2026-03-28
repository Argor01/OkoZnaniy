import React from 'react';
import { Layout, Typography, Avatar } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import styles from './RightSidebar.module.css';

const { Sider } = Layout;
const { Title, Text } = Typography;

interface RightSidebarProps {
  className?: string;
}

const MOCK_QUESTIONS = [
  {
    id: 1,
    authorName: 'Алексей',
    avatarUrl: null,
    text: 'Как правильно рассчитать сечение кабеля для проводки в частном доме, если общая мощность приборов 15кВт?',
    date: '28 Мар 14:30',
    answersCount: 3,
  },
  {
    id: 2,
    authorName: 'Мария',
    avatarUrl: null,
    text: 'Помогите с решением задачи по сопромату: расчет балки на изгиб и кручение.',
    date: '28 Мар 12:15',
    answersCount: 0,
  },
  {
    id: 3,
    authorName: 'Иван',
    avatarUrl: null,
    text: 'Какие основные отличия между архитектурами микросервисов и монолита на практике?',
    date: '27 Мар 18:40',
    answersCount: 12,
  },
  {
    id: 4,
    authorName: 'Елена',
    avatarUrl: null,
    text: 'Нужна помощь с написанием эссе по философии на тему "Влияние технологий на общество".',
    date: '27 Мар 09:20',
    answersCount: 1,
  },
];

const RightSidebar: React.FC<RightSidebarProps> = React.memo(({ className }) => {
  return (
    <Sider
      width="auto"
      className={`${styles.rightSidebar} ${className || ''}`}
      trigger={null}
      collapsible
      collapsed={false}
    >
      <div className={styles.rightSidebarContent}>
        <Title level={4} className={styles.mainTitle}>Портал Знаний</Title>
        
        <div className={styles.questionsList}>
          {MOCK_QUESTIONS.map((q) => (
            <div key={q.id} className={styles.questionCard} onClick={() => console.log('Navigate to question', q.id)}>
              <div className={styles.questionHeader}>
                <Avatar 
                  size={24} 
                  src={q.avatarUrl} 
                  icon={<UserOutlined />} 
                  className={styles.avatar}
                />
                <Text className={styles.authorName}>{q.authorName}</Text>
              </div>
              
              <Text className={styles.questionText}>
                {q.text}
              </Text>
              
              <div className={styles.questionFooter}>
                <Text className={styles.dateText}>{q.date}</Text>
                <div className={styles.answersBlock}>
                  <MessageOutlined className={styles.messageIcon} />
                  <Text className={styles.answersCount}>{q.answersCount}</Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sider>
  );
});

export default RightSidebar;
