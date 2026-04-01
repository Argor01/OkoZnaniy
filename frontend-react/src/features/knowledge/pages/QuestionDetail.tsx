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
  message,
  Spin
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
import { knowledgeApi, Question, Answer } from '../api/knowledgeApi';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const QuestionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  const isExpert = user?.role === 'expert';
  const canAnswer = isExpert; // Только эксперты могут отвечать

  // Загрузка вопроса и ответов
  useEffect(() => {
    if (id) {
      loadQuestion();
    }
  }, [id]);
  
  const loadQuestion = async () => {
    try {
      setLoading(true);
      const data = await knowledgeApi.getQuestion(Number(id));
      setQuestion(data);
      setAnswers(data.answers || []);
    } catch (error: any) {
      console.error('Failed to load question:', error);
      if (error.response?.status === 404) {
        message.error('Вопрос не найден');
        navigate('/knowledge');
      } else {
        message.error('Не удалось загрузить вопрос');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteQuestion = async () => {
    if (!question) return;
    
    try {
      await knowledgeApi.deleteQuestion(question.id);
      message.success('Вопрос успешно удален');
      navigate('/knowledge');
    } catch (error) {
      console.error('Failed to delete question:', error);
      message.error('Не удалось удалить вопрос');
    }
  };

  const handleDeleteAnswer = async (answerId: number) => {
    try {
      await knowledgeApi.deleteAnswer(answerId);
      setAnswers(answers.filter(a => a.id !== answerId));
      if (question) {
        setQuestion({
          ...question,
          answers_count: Math.max(0, question.answers_count - 1)
        });
      }
      message.success('Ответ успешно удален');
    } catch (error) {
      console.error('Failed to delete answer:', error);
      message.error('Не удалось удалить ответ');
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

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

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim() || !question) return;
    
    try {
      const answer = await knowledgeApi.addAnswer(question.id, newAnswer);
      setAnswers([...answers, answer]);
      setQuestion({
        ...question,
        answers_count: question.answers_count + 1,
        status: 'answered'
      });
      setNewAnswer('');
      message.success('Ответ успешно добавлен');
    } catch (error: any) {
      console.error('Failed to add answer:', error);
      message.error(error.response?.data?.error || 'Не удалось добавить ответ');
    }
  };

  const handleLikeAnswer = async (answerId: number) => {
    try {
      const result = await knowledgeApi.toggleLike(answerId);
      setAnswers(answers.map(a => 
        a.id === answerId 
          ? { ...a, likes_count: result.likes_count, is_liked: result.liked }
          : a
      ));
    } catch (error) {
      console.error('Failed to toggle like:', error);
      message.error('Не удалось поставить лайк');
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
                  type={answer.is_liked ? 'primary' : 'text'}
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
