import React, { useState, useEffect } from 'react';
import { Layout, Typography, Avatar, Empty } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import axios from 'axios';
import styles from './RightSidebar.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Sider } = Layout;
const { Title, Text } = Typography;

interface RightSidebarProps {
  className?: string;
}

interface Question {
  id: number;
  title: string;
  description: string;
  category: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  created_at: string;
  views_count: number;
  answers_count: number;
  status: 'open' | 'answered' | 'closed';
  tags: string[];
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const RightSidebar: React.FC<RightSidebarProps> = React.memo(({ className }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/knowledge/questions/`);
        const payload = response.data;
        const allQuestions: unknown =
          Array.isArray(payload) ? payload :
          (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) ? (payload as any).results :
          [];

        const recentQuestions = (allQuestions as Question[]).slice(-5);
        setQuestions(Array.isArray(recentQuestions) ? recentQuestions : []);
      } catch (error) {
        console.error('Failed to load questions:', error);
        setQuestions([]);
      }
    };

    loadQuestions();

    const handleUpdate = () => {
      loadQuestions();
    };

    window.addEventListener('knowledgeQuestionsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('knowledgeQuestionsUpdated', handleUpdate);
    };
  }, []);

  const handleTitleClick = () => {
    navigate('/knowledge');
  };

  const handleQuestionClick = (questionId: number) => {
    navigate(`/knowledge/${questionId}`);
  };

  return (
    <Sider
      width="auto"
      className={`${styles.rightSidebar} ${className || ''}`}
      trigger={null}
      collapsible
      collapsed={false}
    >
      <div className={styles.rightSidebarContent}>
        <Title 
          level={4} 
          className={styles.mainTitle}
          onClick={handleTitleClick}
          style={{ cursor: 'pointer' }}
        >
          Око Ответы
        </Title>
        
        <div className={styles.questionsList}>
          {questions.length === 0 ? (
            <Empty 
              description="Пока нет вопросов" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '20px 0' }}
            />
          ) : (
            questions.map((q) => (
              <div key={q.id} className={styles.questionCard} onClick={() => handleQuestionClick(q.id)}>
                <div className={styles.questionHeader}>
                  <Avatar 
                    size={24} 
                    src={q.author.avatar} 
                    icon={<UserOutlined />} 
                    className={styles.avatar}
                  />
                  <Text className={styles.authorName}>{q.author.name}</Text>
                </div>
                
                <Text className={styles.questionText}>
                  {q.title}
                </Text>
                
                <div className={styles.questionFooter}>
                  <Text className={styles.dateText}>
                    {dayjs(q.created_at).fromNow()}
                  </Text>
                  <div className={styles.answersBlock}>
                    <MessageOutlined className={styles.messageIcon} />
                    <Text className={styles.answersCount}>{q.answers_count}</Text>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Sider>
  );
});

export default RightSidebar;
