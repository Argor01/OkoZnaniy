import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Avatar, 
  Tag, 
  Button, 
  Input,
  Divider,
  Tooltip,
  Empty,
  Alert,
  Popconfirm,
  message
} from 'antd';
import { 
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  LikeOutlined,
  ArrowLeftOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './QuestionDetail.module.css';
import { useAuth } from '@/features/auth/hooks/useAuth';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Answer {
  id: number;
  author: {
    id: number;
    name: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  created_at: string;
  likes_count: number;
  is_best_answer: boolean;
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

const QuestionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Загрузка всех вопросов из localStorage
  const getAllQuestions = (): Question[] => {
    const stored = localStorage.getItem('knowledge_questions');
    return stored ? JSON.parse(stored) : [];
  };

  // Поиск конкретного вопроса по ID
  const findQuestionById = (questionId: string): Question | null => {
    const allQuestions = getAllQuestions();
    return allQuestions.find(q => q.id === Number(questionId)) || null;
  };
  
  // Загрузка данных из localStorage
  const getStoredAnswers = () => {
    // Используем общий ключ для всех пользователей
    const stored = localStorage.getItem(`knowledge_answers_${id}`);
    return stored ? JSON.parse(stored) : [];
  };

  const getStoredLikes = () => {
    // Лайки остаются персональными для каждого пользователя
    const stored = localStorage.getItem(`user_${user?.id || 'guest'}_question_${id}_likes`);
    return stored ? new Set(JSON.parse(stored)) : new Set<number>();
  };

  const initialQuestion = findQuestionById(id || '');
  const [question, setQuestion] = useState<Question | null>(initialQuestion);
  const [answers, setAnswers] = useState<Answer[]>(getStoredAnswers);
  const [newAnswer, setNewAnswer] = useState('');
  const [likedAnswers, setLikedAnswers] = useState<Set<number>>(getStoredLikes);

  const isExpert = user?.role === 'expert';
  const canAnswer = isExpert; // Только эксперты могут отвечать

  // Обновление вопроса при изменении ID
  useEffect(() => {
    const currentQuestion = findQuestionById(id || '');
    setQuestion(currentQuestion);
    
    // Загружаем ответы для текущего вопроса (общие для всех)
    const storedAnswers = localStorage.getItem(`knowledge_answers_${id}`);
    setAnswers(storedAnswers ? JSON.parse(storedAnswers) : []);
    
    // Загружаем лайки для текущего пользователя
    const storedLikes = localStorage.getItem(`user_${user?.id || 'guest'}_question_${id}_likes`);
    setLikedAnswers(storedLikes ? new Set(JSON.parse(storedLikes)) : new Set());
    
    // Слушатель для обновления ответов в реальном времени
    const handleAnswersUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.questionId === id) {
        const updatedAnswers = localStorage.getItem(`knowledge_answers_${id}`);
        if (updatedAnswers) {
          setAnswers(JSON.parse(updatedAnswers));
        }
      }
    };
    
    window.addEventListener('knowledgeAnswersUpdated', handleAnswersUpdate);
    
    return () => {
      window.removeEventListener('knowledgeAnswersUpdated', handleAnswersUpdate);
    };
  }, [id, user?.id]);

  // Сохранение в localStorage при изменении
  useEffect(() => {
    if (question && answers.length > 0) {
      // Сохраняем ответы в общее хранилище для всех пользователей
      localStorage.setItem(`knowledge_answers_${id}`, JSON.stringify(answers));
      // Отправляем событие для обновления других вкладок
      window.dispatchEvent(new CustomEvent('knowledgeAnswersUpdated', { detail: { questionId: id } }));
    }
  }, [answers, id, question]);

  useEffect(() => {
    if (question) {
      // Лайки сохраняем персонально для каждого пользователя
      localStorage.setItem(`user_${user?.id || 'guest'}_question_${id}_likes`, JSON.stringify(Array.from(likedAnswers)));
    }
  }, [likedAnswers, id, question, user?.id]);

  React.useEffect(() => {
    localStorage.setItem(`question_${id}_data`, JSON.stringify(question));
  }, [question, id]);

  // Увеличиваем счетчик просмотров при открытии страницы
  useEffect(() => {
    if (!question) return;
    
    const viewedKey = `question_${id}_page_viewed`;
    const hasViewed = localStorage.getItem(viewedKey);
    
    if (!hasViewed) {
      // Увеличиваем счетчик просмотров
      setQuestion(prev => prev ? ({
        ...prev,
        views_count: prev.views_count + 1
      }) : null);
      
      // Отмечаем, что страница была просмотрена
      localStorage.setItem(viewedKey, 'true');
      
      // TODO: Отправить на сервер
      console.log(`Question ${id} page viewed`);
    }
  }, [id, question?.id]);

  const handleBack = () => {
    navigate('/knowledge');
  };

  const handleUserClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    // Не переходим на профиль для моковых/несуществующих пользователей
    if (userId === 0 || userId === 999) {
      return;
    }
    navigate(`/user/${userId}`);
  };

  const handleDeleteQuestion = () => {
    if (!question) return;
    
    // Удаляем вопрос из localStorage
    const stored = localStorage.getItem('knowledge_questions');
    if (stored) {
      const allQuestions = JSON.parse(stored);
      const updatedQuestions = allQuestions.filter((q: Question) => q.id !== question.id);
      localStorage.setItem('knowledge_questions', JSON.stringify(updatedQuestions));
      window.dispatchEvent(new Event('knowledgeQuestionsUpdated'));
    }
    
    // Удаляем связанные данные (общие ответы)
    localStorage.removeItem(`knowledge_answers_${id}`);
    localStorage.removeItem(`question_${id}_page_viewed`);
    
    message.success('Вопрос успешно удален');
    navigate('/knowledge');
  };

  const handleDeleteAnswer = (answerId: number) => {
    setAnswers(answers.filter(a => a.id !== answerId));
    if (question) {
      setQuestion({
        ...question,
        answers_count: Math.max(0, question.answers_count - 1)
      });
    }
    message.success('Ответ успешно удален');
  };

  if (!question) {
    return (
      <div className={styles.container}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className={styles.backButton}
        >
          Назад к вопросам
        </Button>
        <Empty description="Вопрос не найден" />
      </div>
    );
  }

  const handleSubmitAnswer = () => {
    if (newAnswer.trim()) {
      const answer: Answer = {
        id: Date.now(), // Используем timestamp для уникальности
        author: { 
          id: user?.id || 0, 
          name: user?.username || 'Аноним',
          role: user?.role === 'expert' ? 'Эксперт' : undefined
        },
        content: newAnswer,
        created_at: new Date().toISOString(),
        likes_count: 0,
        is_best_answer: false
      };
      
      setAnswers([...answers, answer]);
      if (question) {
        setQuestion({
          ...question,
          answers_count: question.answers_count + 1
        });
      }
      setNewAnswer('');
    }
  };

  const handleLikeAnswer = (answerId: number) => {
    if (likedAnswers.has(answerId)) {
      // Убрать лайк
      setLikedAnswers(prev => {
        const newSet = new Set(prev);
        newSet.delete(answerId);
        return newSet;
      });
      setAnswers(answers.map(a => 
        a.id === answerId 
          ? { ...a, likes_count: a.likes_count - 1 }
          : a
      ));
    } else {
      // Поставить лайк
      setLikedAnswers(prev => new Set(prev).add(answerId));
      setAnswers(answers.map(a => 
        a.id === answerId 
          ? { ...a, likes_count: a.likes_count + 1 }
          : a
      ));
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'blue',
      answered: 'green',
      closed: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Открыт',
      answered: 'Есть ответы',
      closed: 'Закрыт'
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className={styles.container}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleBack}
        className={styles.backButton}
      >
        Назад к вопросам
      </Button>

      <Card className={styles.questionCard}>
        <div className={styles.questionHeader}>
          <Space 
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleUserClick(question.author.id, e)}
          >
            <Avatar size={48} icon={<UserOutlined />} />
            <div>
              <Text strong className={styles.authorName}>{question.author.name}</Text>
              <br />
              <Text type="secondary" className={styles.dateText}>
                <ClockCircleOutlined /> {dayjs(question.created_at).fromNow()}
              </Text>
            </div>
          </Space>
          <Space>
            <Tag color={getStatusColor(question.status)}>
              {getStatusText(question.status)}
            </Tag>
            {user?.id === question.author.id && (
              <Popconfirm
                title="Удалить вопрос?"
                description="Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить."
                onConfirm={handleDeleteQuestion}
                okText="Удалить"
                cancelText="Отмена"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  size="small"
                >
                  Удалить
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        <Title level={2} className={styles.questionTitle}>
          {question.title}
        </Title>

        <Paragraph className={styles.questionDescription}>
          {question.description}
        </Paragraph>

        <div className={styles.questionMeta}>
          <Space wrap>
            <Tag color="blue">{question.category}</Tag>
            {question.tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>

          <Space size="large">
            <Tooltip title="Просмотры">
              <Space size={4}>
                <EyeOutlined />
                <Text type="secondary">{question.views_count}</Text>
              </Space>
            </Tooltip>
            <Tooltip title="Ответы">
              <Space size={4}>
                <MessageOutlined />
                <Text type="secondary">{question.answers_count}</Text>
              </Space>
            </Tooltip>
          </Space>
        </div>
      </Card>

      <Divider orientation="left">
        <Title level={4}>Ответы ({answers.length})</Title>
      </Divider>

      {answers.length === 0 ? (
        <Empty description="Пока нет ответов. Будьте первым!" />
      ) : (
        <div className={styles.answersList}>
          {answers.map((answer) => (
            <Card 
              key={answer.id}
              className={`${styles.answerCard} ${answer.is_best_answer ? styles.bestAnswer : ''}`}
            >
              {answer.is_best_answer && (
                <div className={styles.bestAnswerBadge}>
                  <Tag color="gold">Лучший ответ</Tag>
                </div>
              )}
              
              <div className={styles.answerHeader}>
                <Space 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleUserClick(answer.author.id, e)}
                >
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Space>
                      <Text strong>{answer.author.name}</Text>
                      {answer.author.role && (
                        <Tag color="purple">{answer.author.role}</Tag>
                      )}
                    </Space>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {dayjs(answer.created_at).fromNow()}
                    </Text>
                  </div>
                </Space>
              </div>

              <Paragraph className={styles.answerContent}>
                {answer.content}
              </Paragraph>

              <div className={styles.answerFooter}>
                <Button 
                  type={likedAnswers.has(answer.id) ? 'primary' : 'text'}
                  icon={<LikeOutlined />}
                  size="small"
                  onClick={() => handleLikeAnswer(answer.id)}
                >
                  Полезно ({answer.likes_count})
                </Button>
                
                {user?.id === answer.author.id && (
                  <Popconfirm
                    title="Удалить ответ?"
                    description="Вы уверены, что хотите удалить этот ответ?"
                    onConfirm={() => handleDeleteAnswer(answer.id)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button 
                      danger 
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                    >
                      Удалить
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canAnswer ? (
        <Card className={styles.answerFormCard}>
          <Title level={4}>Ваш ответ</Title>
          <TextArea
            rows={6}
            placeholder="Напишите ваш ответ..."
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            className={styles.answerTextarea}
          />
          <Button 
            type="primary" 
            onClick={handleSubmitAnswer}
            disabled={!newAnswer.trim()}
            className={styles.submitButton}
          >
            Отправить ответ
          </Button>
        </Card>
      ) : (
        <Alert
          message="Только эксперты могут отвечать на вопросы"
          description="Чтобы отвечать на вопросы, вам необходимо стать экспертом."
          type="info"
          showIcon
          style={{ marginTop: 32 }}
        />
      )}
    </div>
  );
};

export default QuestionDetail;
