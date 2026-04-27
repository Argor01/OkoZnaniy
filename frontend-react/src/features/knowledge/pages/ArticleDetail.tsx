import React, { useState } from 'react';
import { Typography, Card, Tag, Spin, Button, Empty, Popconfirm, Modal, Input, Select, message } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileOutlined,
  DownloadOutlined,
  DeleteOutlined,
  WarningOutlined,
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

  const [complainModalOpen, setComplainModalOpen] = useState(false);
  const [complainReason, setComplainReason] = useState('other');
  const [complainDescription, setComplainDescription] = useState('');
  const [complainLoading, setComplainLoading] = useState(false);

  const canDelete =
    userProfile?.role === 'admin' ||
    (article && userProfile && article.author.id === userProfile.id);

  const canComplain =
    userProfile &&
    article &&
    article.author.id !== userProfile.id &&
    userProfile.role !== 'admin';

  const handleComplain = async () => {
    if (!article || !complainDescription.trim()) {
      message.error('Укажите описание жалобы');
      return;
    }
    setComplainLoading(true);
    try {
      await articlesApi.complainArticle(article.id, {
        reason: complainReason,
        description: complainDescription,
      });
      message.success('Жалоба отправлена');
      setComplainModalOpen(false);
      setComplainDescription('');
      setComplainReason('other');
    } catch {
      message.error('Не удалось отправить жалобу');
    } finally {
      setComplainLoading(false);
    }
  };

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
          <div style={{ display: 'flex', gap: 8 }}>
            {canComplain && (
              <Button
                icon={<WarningOutlined />}
                size="small"
                onClick={() => setComplainModalOpen(true)}
              >
                Пожаловаться
              </Button>
            )}
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
        </div>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <UserOutlined /> {getAuthorName(article.author)}
          </span>
          <span className={styles.metaItem}>
            <ClockCircleOutlined />{' '}
            {dayjs(article.created_at).format('D MMMM YYYY, HH:mm')}
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

      <Modal
        title="Пожаловаться на статью"
        open={complainModalOpen}
        onCancel={() => setComplainModalOpen(false)}
        onOk={handleComplain}
        okText="Отправить жалобу"
        cancelText="Отмена"
        confirmLoading={complainLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text strong>Причина</Text>
            <Select
              value={complainReason}
              onChange={setComplainReason}
              style={{ width: '100%', marginTop: 4 }}
            >
              <Select.Option value="spam">Спам</Select.Option>
              <Select.Option value="inappropriate">Неприемлемый контент</Select.Option>
              <Select.Option value="copyright">Нарушение авторских прав</Select.Option>
              <Select.Option value="misinformation">Недостоверная информация</Select.Option>
              <Select.Option value="other">Другое</Select.Option>
            </Select>
          </div>
          <div>
            <Text strong>Описание жалобы *</Text>
            <Input.TextArea
              rows={4}
              value={complainDescription}
              onChange={(e) => setComplainDescription(e.target.value)}
              placeholder="Опишите причину жалобы..."
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ArticleDetail;
