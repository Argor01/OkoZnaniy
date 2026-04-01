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
  Spin,
  message
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

  
  // Загрузка данных с сервера
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
    loadData(); // Перезагружаем список вопросов
    message.success('Вопрос успешно создан!');
  };
  
  const filteredQuestions = questions;

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
