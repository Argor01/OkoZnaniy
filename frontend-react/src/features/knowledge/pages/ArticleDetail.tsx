import React from 'react';
import { Typography, Card, Tag, Spin, Button, Empty, Popconfirm, message } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { articlesApi, type Article } from '../api/knowledgeApi';
import { authApi } from '@/features/auth/api/auth';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import styles from './ArticleDetail.module.css';

dayjs.locale('ru');

const { Title, Text } = Typography;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const {
    data: article,
    isLoading,
    error,
  } = useQuery<Article>({
    queryKey: ['knowledge-article', id],
    queryFn: () => articlesApi.getArticle(Number(id)),
    enabled: !!id,
  });

  const canDelete =
    userProfile?.role === 'admin' ||
    (article && userProfile && article.author.id === userProfile.id);

  const handleDelete = async () => {
    if (!article) return;
    try {
      await articlesApi.deleteArticle(article.id);
      message.success('Статья удалена');
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      navigate('/knowledge-base');
    } catch {
      message.error('Не удалось удалить статью');
    }
  };

  const getAuthorName = (author: Article['author']) => {
    if (author.first_name || author.last_name) {
      return `${author.first_name} ${author.last_name}`.trim();
    }
    return author.username;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Empty description="Статья не найдена" />
        <Button onClick={() => navigate('/knowledge-base')} style={{ marginTop: 16 }}>
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/knowledge-base')}
        className={styles.backButton}
      >
        Назад к статьям
      </Button>

      <Card className={styles.card}>
        <div className={styles.titleRow}>
          <Title level={3} className={styles.title}>
            {article.title}
          </Title>
          {canDelete && (
            <Popconfirm
              title="Удалить статью?"
              description="Это действие нельзя отменить"
              onConfirm={handleDelete}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                Удалить
              </Button>
            </Popconfirm>
          )}
        </div>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <UserOutlined /> {getAuthorName(article.author)}
          </span>
          <span className={styles.metaItem}>
            <ClockCircleOutlined />{' '}
            {dayjs(article.created_at).format('D MMMM YYYY, HH:mm')}
          </span>
          <span className={styles.metaItem}>
            <EyeOutlined /> {article.views_count} просмотров
          </span>
        </div>

        <div className={styles.tags}>
          {article.work_type && <Tag color="blue">{article.work_type}</Tag>}
          {article.subject && <Tag color="green">{article.subject}</Tag>}
        </div>

        <div className={styles.description}>{article.description}</div>

        {article.files && article.files.length > 0 && (
          <div className={styles.filesSection}>
            <Title level={5} className={styles.filesTitle}>
              <FileOutlined /> Прикрепленные файлы
            </Title>
            <div className={styles.filesList}>
              {article.files.map((file) => (
                <a
                  key={file.id}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileItem}
                >
                  <FileOutlined />
                  <span className={styles.fileName}>{file.original_name}</span>
                  <span className={styles.fileSize}>
                    {formatFileSize(file.file_size)}
                  </span>
                  <DownloadOutlined />
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArticleDetail;
