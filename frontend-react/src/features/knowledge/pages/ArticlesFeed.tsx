import React, { useState } from 'react';
import { Typography, Input, Select, Tag, Empty, Spin, Card, Button, message } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi, type Article } from '../api/knowledgeApi';
import { catalogApi, type WorkType, type Subject } from '@/features/common/api/catalog';
import { authApi } from '@/features/auth/api/auth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './ArticlesFeed.module.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Paragraph } = Typography;
const { Search } = Input;

const ArticlesFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ['work-types'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge-articles', searchText, selectedWorkType, selectedSubject],
    queryFn: () =>
      articlesApi.getArticles({
        search: searchText || undefined,
        work_type: selectedWorkType,
        subject: selectedSubject,
      }),
  });

  const canCreate = userProfile?.role === 'expert' || userProfile?.role === 'admin';

  const getAuthorName = (author: Article['author']) => {
    if (author.first_name || author.last_name) {
      return `${author.first_name} ${author.last_name}`.trim();
    }
    return author.username;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>
          <BookOutlined style={{ marginRight: 8 }} />
          База Знаний
        </Title>
        <Paragraph type="secondary">
          Статьи и материалы от экспертов
        </Paragraph>
      </div>

      <div className={styles.filtersRow}>
        <Search
          placeholder="Поиск по статьям..."
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchInput}
        />
        <Select
          placeholder="Тип работы"
          allowClear
          value={selectedWorkType}
          onChange={setSelectedWorkType}
          style={{ minWidth: 180 }}
          size="large"
        >
          {workTypes.map((wt) => (
            <Select.Option key={wt.id} value={wt.name}>
              {wt.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Предмет"
          allowClear
          value={selectedSubject}
          onChange={setSelectedSubject}
          style={{ minWidth: 180 }}
          size="large"
          showSearch
          filterOption={(input, option) =>
            (option?.children as unknown as string)
              ?.toLowerCase()
              .includes(input.toLowerCase()) ?? false
          }
        >
          {subjects.map((s) => (
            <Select.Option key={s.id} value={s.name}>
              {s.name}
            </Select.Option>
          ))}
        </Select>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/knowledge-base/create')}
            className={styles.createButton}
          >
            Написать статью
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : articles.length === 0 ? (
        <div className={styles.emptyContainer}>
          <Empty
            description="Статей пока нет"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        articles.map((article) => (
          <Card
            key={article.id}
            className={styles.articleCard}
            onClick={() => navigate(`/knowledge-base/${article.id}`)}
            hoverable
          >
            <div className={styles.articleCardBody}>
              <div className={styles.articleTitle}>{article.title}</div>
              <div className={styles.articleMeta}>
                <span className={styles.articleMetaItem}>
                  <UserOutlined /> {getAuthorName(article.author)}
                </span>
                <span className={styles.articleMetaItem}>
                  <ClockCircleOutlined /> {dayjs(article.created_at).fromNow()}
                </span>
                <span className={styles.articleMetaItem}>
                  <EyeOutlined /> {article.views_count}
                </span>
                {(article.files_count ?? 0) > 0 && (
                  <span className={styles.articleMetaItem}>
                    <FileOutlined /> {article.files_count}
                  </span>
                )}
              </div>
              <div className={styles.articleDescription}>
                {article.description}
              </div>
              <div className={styles.articleTags}>
                {article.work_type && (
                  <Tag color="blue">{article.work_type}</Tag>
                )}
                {article.subject && (
                  <Tag color="green">{article.subject}</Tag>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default ArticlesFeed;
