import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Tag, 
  Typography, 
  Input,
  Select,
  Button,
  Avatar,
  Tooltip,
  Empty,
  Spin,
  message
} from 'antd';
import { 
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  FilterOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './KnowledgePortal.module.css';
import { knowledgeApi, Category, Question } from '../api/knowledgeApi';
import { CreateQuestionModal } from '../components/CreateQuestionModal';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

export const KnowledgePortal: React.FC = () => {
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  
  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus, searchText]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, questionsData] = await Promise.all([
        knowledgeApi.getCategories(),
        knowledgeApi.getQuestions({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          search: searchText || undefined,
        })
      ]);
      setCategories(categoriesData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      message.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleQuestionCreated = (newQuestion: Question) => {
    setIsModalVisible(false);
    loadData();
    message.success('Вопрос успешно создан!');
  };
  
  const filteredQuestions = questions;

  const stats = useMemo(() => {
    const totalQuestions = filteredQuestions.length;
    const answeredQuestions = filteredQuestions.filter(q => q.status === 'answered').length;
    const totalAnswers = filteredQuestions.reduce((sum, q) => sum + q.answers_count, 0);
    return { totalQuestions, answeredQuestions, totalAnswers };
  }, [filteredQuestions]);

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

  const handleUserClick = (userId: number, username: string | undefined, event: React.MouseEvent) => {
    event.stopPropagation();
    if (userId === 0 || userId === 999 || !username) {
      return;
    }
    navigate(`/user/${username}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.headerTitle}>Око Ответы</Title>
        <Text className={styles.headerSubtitle}>
          Задавайте вопросы и получайте ответы от экспертов
        </Text>
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <QuestionCircleOutlined />
          </div>
          <div>
            <div className={styles.statLabel}>Вопросов</div>
            <div className={styles.statValue}>{stats.totalQuestions}</div>
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <CheckCircleOutlined />
          </div>
          <div>
            <div className={styles.statLabel}>С ответами</div>
            <div className={styles.statValue}>{stats.answeredQuestions}</div>
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <MessageOutlined />
          </div>
          <div>
            <div className={styles.statLabel}>Ответов</div>
            <div className={styles.statValue}>{stats.totalAnswers}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <Search
            placeholder="Поиск по вопросам..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.searchInput}
          />
          
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: 200 }}
            suffixIcon={<FilterOutlined />}
            loading={loading}
            size="large"
          >
            <Option value="all">Все категории</Option>
            {categories.map(cat => (
              <Option key={cat.id} value={cat.name}>{cat.name}</Option>
            ))}
          </Select>

          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 170 }}
            size="large"
          >
            <Option value="all">Все статусы</Option>
            <Option value="open">Открытые</Option>
            <Option value="answered">С ответами</Option>
          </Select>

          <Button 
            type="primary" 
            icon={<MessageOutlined />} 
            onClick={handleCreateQuestion}
            className={styles.askButton}
            size="large"
          >
            Задать вопрос
          </Button>
        </div>
      </Card>

      {/* Questions list */}
      <div className={styles.questionsList}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Spin size="large" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className={styles.emptyState}>
            <Empty description="Вопросы не найдены" />
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div 
              key={question.id}
              className={styles.questionCard}
              onClick={() => handleQuestionClick(question.id)}
            >
              <div className={styles.questionCardInner}>
                {/* Author row */}
                <div className={styles.authorRow}>
                  <div 
                    className={styles.authorInfo}
                    onClick={(e) => handleUserClick(question.author.id, question.author.username, e)}
                  >
                    <Avatar 
                      size={40} 
                      icon={<UserOutlined />}
                      src={question.author.avatar}
                      className={styles.authorAvatar}
                    />
                    <div className={styles.authorMeta}>
                      <span className={styles.authorName}>{question.author.name}</span>
                      <span className={styles.authorTime}>
                        <ClockCircleOutlined /> {dayjs(question.created_at).fromNow()}
                      </span>
                    </div>
                  </div>
                  <Tag 
                    color={getStatusColor(question.status)}
                    className={styles.statusTag}
                  >
                    {getStatusText(question.status)}
                  </Tag>
                </div>

                {/* Content */}
                <div className={styles.questionContent}>
                  <div className={styles.questionTitle}>
                    {question.title}
                  </div>
                  <Paragraph 
                    ellipsis={{ rows: 2 }}
                    className={styles.questionDescription}
                  >
                    {question.description}
                  </Paragraph>
                </div>

                {/* Info chips */}
                <div className={styles.infoGrid}>
                  <span className={styles.infoChip}>
                    <EyeOutlined className={styles.infoChipIcon} />
                    {question.views_count} просмотров
                  </span>
                  <span className={styles.infoChip}>
                    <MessageOutlined className={styles.infoChipIcon} />
                    {question.answers_count} ответов
                  </span>
                </div>

                {/* Footer */}
                <div className={styles.questionFooter}>
                  <div className={styles.tagsRow}>
                    <Tag color="blue" className={styles.categoryTag}>
                      <BookOutlined /> {question.category}
                    </Tag>
                    {question.tags.map(tag => (
                      <Tag key={tag} className={styles.regularTag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
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
