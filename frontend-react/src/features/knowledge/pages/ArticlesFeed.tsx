import React, { useState } from 'react';
import { Typography, Input, Select, Tag, Empty, Spin, Card, Button, Modal, message } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi, type Article, type ArticleDeletion } from '../api/knowledgeApi';
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

const DELETION_STATUS_LABELS: Record<string, string> = {
  deleted: 'Удалена',
  disputed: 'Оспаривается',
  upheld: 'Удаление подтверждено',
  restored: 'Восстановлена',
};

const ArticlesFeed: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeDeletionId, setDisputeDeletionId] = useState<number | null>(null);
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

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

  const { data: myDeletions = [] } = useQuery<ArticleDeletion[]>({
    queryKey: ['my-article-deletions'],
    queryFn: () => articlesApi.getDeletions(),
    enabled: userProfile?.role === 'expert',
  });

  const canCreate = userProfile?.role === 'expert' || userProfile?.role === 'admin';

  const handleDispute = async () => {
    if (!disputeDeletionId || !disputeMessage.trim()) {
      message.error('Укажите причину оспаривания');
      return;
    }
    setDisputeLoading(true);
    try {
      await articlesApi.disputeDeletion(disputeDeletionId, {
        dispute_message: disputeMessage,
      });
      message.success('Оспаривание отправлено');
      queryClient.invalidateQueries({ queryKey: ['my-article-deletions'] });
      setDisputeModalOpen(false);
      setDisputeMessage('');
      setDisputeDeletionId(null);
    } catch {
      message.error('Не удалось отправить оспаривание');
    } finally {
      setDisputeLoading(false);
    }
  };

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
                {(article.files_count ?? 0) > 0 && (
                  <span className={styles.articleMetaItem}>
                    <FileOutlined /> {article.files_count} файл(ов)
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

      {userProfile?.role === 'expert' && myDeletions.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <Title level={4}>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Удалённые статьи
          </Title>
          {myDeletions.map((deletion) => (
            <Card key={deletion.id} style={{ marginBottom: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Tag color={
                      deletion.status === 'disputed' ? 'orange' :
                      deletion.status === 'restored' ? 'green' :
                      deletion.status === 'upheld' ? 'red' : 'default'
                    }>
                      {DELETION_STATUS_LABELS[deletion.status] || deletion.status}
                    </Tag>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{deletion.article_title}</div>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
                    Удалена: {dayjs(deletion.created_at).format('D MMMM YYYY, HH:mm')}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Причина: </strong>{deletion.reason}
                  </div>
                  {deletion.dispute_message && (
                    <div style={{ marginTop: 8, padding: 10, background: '#fff7e6', borderRadius: 6 }}>
                      <strong style={{ color: '#d48806' }}>Ваше оспаривание: </strong>
                      {deletion.dispute_message}
                    </div>
                  )}
                  {deletion.admin_final_response && (
                    <div style={{ marginTop: 8, padding: 10, background: '#f6ffed', borderRadius: 6 }}>
                      <strong style={{ color: '#389e0d' }}>Решение администратора: </strong>
                      {deletion.admin_final_response}
                    </div>
                  )}
                </div>
                {deletion.status === 'deleted' && (
                  <Button
                    type="primary"
                    onClick={() => {
                      setDisputeDeletionId(deletion.id);
                      setDisputeModalOpen(true);
                    }}
                  >
                    Оспорить
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="Оспорить удаление статьи"
        open={disputeModalOpen}
        onCancel={() => { setDisputeModalOpen(false); setDisputeMessage(''); }}
        onOk={handleDispute}
        okText="Отправить"
        cancelText="Отмена"
        confirmLoading={disputeLoading}
      >
        <div>
          <div style={{ marginBottom: 12 }}>
            Опишите, почему вы считаете удаление неправомерным. Ваше обращение будет рассмотрено администратором.
          </div>
          <Input.TextArea
            rows={4}
            value={disputeMessage}
            onChange={(e) => setDisputeMessage(e.target.value)}
            placeholder="Укажите причину оспаривания..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default ArticlesFeed;
