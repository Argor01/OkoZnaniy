import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Select,
  Button,
  Avatar,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import { 
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './KnowledgePortal.module.css';
import { knowledgeApi, Category } from '../api/knowledgeApi';
import { CreateQuestionModal } from '../components/CreateQuestionModal';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

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

export const KnowledgePortal: React.FC = () => {
  const navigate = useNavigate();
  
  // Загрузка вопросов из localStorage
  const getStoredQuestions = () => {
    const stored = localStorage.getItem('knowledge_questions');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored questions:', error);
        return [];
      }
    }
    return [];
  };

  const [questions, setQuestions] = useState<Question[]>(getStoredQuestions);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewedQuestions, setViewedQuestions] = useState<Set<number>>(new Set());
  const questionRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Сохранение вопросов в localStorage
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('knowledge_questions', JSON.stringify(questions));
      // Отправляем событие для обновления других компонентов
      window.dispatchEvent(new Event('knowledgeQuestionsUpdated'));
    }
  }, [questions]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await knowledgeApi.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleCreateQuestion = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleQuestionCreated = (newQuestion: Question) => {
    setIsModalVisible(false);
    // Добавляем новый вопрос в начало списка
    setQuestions(prev => [newQuestion, ...prev]);
  };
  
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         q.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || q.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Intersection Observer для отслеживания просмотров
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const questionId = Number(entry.target.getAttribute('data-question-id'));
            
            // Проверяем, что вопрос еще не был просмотрен
            if (questionId && !viewedQuestions.has(questionId)) {
              // Добавляем небольшую задержку, чтобы засчитать просмотр только если пользователь действительно смотрит
              setTimeout(() => {
                if (entry.isIntersecting) {
                  handleQuestionView(questionId);
                }
              }, 1000); // 1 секунда задержки
            }
          }
        });
      },
      {
        threshold: 0.5, // Элемент должен быть виден минимум на 50%
        rootMargin: '0px'
      }
    );

    // Наблюдаем за всеми карточками вопросов
    questionRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [filteredQuestions, viewedQuestions]);

  const handleQuestionView = (questionId: number) => {
    // Проверяем, был ли уже просмотр этого вопроса
    const viewedKey = `question_${questionId}_viewed`;
    if (localStorage.getItem(viewedKey)) {
      return; // Уже просмотрен, не увеличиваем счетчик
    }

    // Отмечаем вопрос как просмотренный
    setViewedQuestions(prev => new Set(prev).add(questionId));
    
    // Увеличиваем счетчик просмотров
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId 
          ? { ...q, views_count: q.views_count + 1 }
          : q
      )
    );

    // Сохраняем в localStorage
    localStorage.setItem(viewedKey, 'true');
    
    // TODO: Отправить на сервер
    console.log(`Question ${questionId} viewed`);
  };

  const setQuestionRef = (questionId: number, element: HTMLDivElement | null) => {
    if (element) {
      questionRefs.current.set(questionId, element);
    } else {
      questionRefs.current.delete(questionId);
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

  const handleQuestionClick = (questionId: number) => {
    navigate(`/knowledge/${questionId}`);
  };

  const handleUserClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    // Не переходим на профиль для моковых/несуществующих пользователей
    if (userId === 0 || userId === 999) {
      return;
    }
    navigate(`/user/${userId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Портал Знаний</Title>
        <Paragraph>
          Задавайте вопросы и получайте ответы от экспертов
        </Paragraph>
      </div>

      <Card className={styles.filtersCard}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Search
            placeholder="Поиск по вопросам..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.searchInput}
          />
          
          <Space wrap>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 200 }}
              suffixIcon={<FilterOutlined />}
              loading={loading}
            >
              <Option value="all">Все категории</Option>
              {categories.map(cat => (
                <Option key={cat.id} value={cat.name}>{cat.name}</Option>
              ))}
            </Select>

            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 150 }}
            >
              <Option value="all">Все статусы</Option>
              <Option value="open">Открытые</Option>
              <Option value="answered">С ответами</Option>
            </Select>

            <Button type="primary" icon={<MessageOutlined />} onClick={handleCreateQuestion}>
              Задать вопрос
            </Button>
          </Space>
        </Space>
      </Card>

      <div className={styles.questionsList}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Empty description="Вопросы не найдены" />
        ) : (
          <List
            dataSource={filteredQuestions}
            renderItem={(question) => (
              <Card 
                key={question.id}
                ref={(el) => setQuestionRef(question.id, el)}
                data-question-id={question.id}
                className={styles.questionCard}
                hoverable
                onClick={() => handleQuestionClick(question.id)}
              >
                <div className={styles.questionHeader}>
                  <Space 
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => handleUserClick(question.author.id, e)}
                  >
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>{question.author.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <ClockCircleOutlined /> {dayjs(question.created_at).fromNow()}
                      </Text>
                    </div>
                  </Space>
                  <Tag color={getStatusColor(question.status)}>
                    {getStatusText(question.status)}
                  </Tag>
                </div>

                <div className={styles.questionContent}>
                  <Title level={4} className={styles.questionTitle}>
                    {question.title}
                  </Title>
                  <Paragraph 
                    ellipsis={{ rows: 2 }}
                    className={styles.questionDescription}
                  >
                    {question.description}
                  </Paragraph>
                </div>

                <div className={styles.questionFooter}>
                  <Space wrap>
                    <Tag color="blue">{question.category}</Tag>
                    {question.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>

                  <Space>
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
            )}
          />
        )}
      </div>

      <CreateQuestionModal
        visible={isModalVisible}
        onCancel={handleModalClose}
        onSuccess={handleQuestionCreated}
      />
    </div>
  );
};

export default KnowledgePortal;
