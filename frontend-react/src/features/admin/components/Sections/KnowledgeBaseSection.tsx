import React, { useState } from 'react';
import {
  Typography,
  Input,
  Select,
  Card,
  Tag,
  Empty,
  Spin,
  Button,
  Upload,
  Modal,
  Tabs,
  Badge,
  message,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileOutlined,
  DeleteOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  articlesApi,
  type Article,
  type ArticleComplaint,
  type ArticleDeletion,
} from '@/features/knowledge/api/knowledgeApi';
import {
  catalogApi,
  type WorkType,
  type Subject,
} from '@/features/common/api/catalog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

type View = 'list' | 'create' | 'detail' | 'complaints' | 'deletions';

const REASON_LABELS: Record<string, string> = {
  spam: 'Спам',
  inappropriate: 'Неприемлемый контент',
  copyright: 'Нарушение авторских прав',
  misinformation: 'Недостоверная информация',
  other: 'Другое',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'На рассмотрении',
  reviewed: 'Рассмотрена',
  rejected: 'Отклонена',
  article_deleted: 'Статья удалена',
};

const DELETION_STATUS_LABELS: Record<string, string> = {
  deleted: 'Удалена',
  disputed: 'Оспаривается',
  upheld: 'Подтверждено',
  restored: 'Восстановлена',
};

export const KnowledgeBaseSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
  const [activeTab, setActiveTab] = useState('articles');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWorkType, setFormWorkType] = useState<string | undefined>();
  const [formSubject, setFormSubject] = useState<string | undefined>();
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteArticleId, setDeleteArticleId] = useState<number | null>(null);
  const [deleteComplaintId, setDeleteComplaintId] = useState<number | undefined>();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveDeletionId, setResolveDeletionId] = useState<number | null>(null);
  const [resolveDecision, setResolveDecision] = useState<string>('upheld');
  const [resolveResponse, setResolveResponse] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

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

  const { data: articleDetail, isLoading: detailLoading } = useQuery<Article>({
    queryKey: ['knowledge-article', selectedArticleId],
    queryFn: () => articlesApi.getArticle(selectedArticleId!),
    enabled: view === 'detail' && !!selectedArticleId,
  });

  const { data: complaints = [] } = useQuery<ArticleComplaint[]>({
    queryKey: ['article-complaints'],
    queryFn: () => articlesApi.getComplaints(),
  });

  const { data: deletions = [] } = useQuery<ArticleDeletion[]>({
    queryKey: ['article-deletions'],
    queryFn: () => articlesApi.getDeletions(),
  });

  const pendingComplaints = complaints.filter((c) => c.status === 'pending');
  const disputedDeletions = deletions.filter((d) => d.status === 'disputed');

  const handleDeleteWithReason = async () => {
    if (!deleteArticleId || !deleteReason.trim()) {
      message.error('Укажите причину удаления');
      return;
    }
    setDeleteLoading(true);
    try {
      await articlesApi.deleteWithReason(deleteArticleId, {
        reason: deleteReason,
        complaint_id: deleteComplaintId,
      });
      message.success('Статья удалена, уведомление отправлено автору');
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['article-deletions'] });
      setDeleteModalOpen(false);
      setDeleteReason('');
      setDeleteArticleId(null);
      setDeleteComplaintId(undefined);
      if (view === 'detail') setView('list');
    } catch {
      message.error('Ошибка удаления статьи');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!resolveDeletionId) return;
    setResolveLoading(true);
    try {
      await articlesApi.resolveDispute(resolveDeletionId, {
        decision: resolveDecision,
        response: resolveResponse,
      });
      message.success(resolveDecision === 'restored' ? 'Статья восстановлена' : 'Удаление подтверждено');
      queryClient.invalidateQueries({ queryKey: ['article-deletions'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      setResolveModalOpen(false);
      setResolveResponse('');
      setResolveDeletionId(null);
    } catch {
      message.error('Ошибка обработки');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      message.error('Укажите название статьи');
      return;
    }
    if (!formDescription.trim()) {
      message.error('Укажите описание');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('description', formDescription.trim());
      if (formWorkType) formData.append('work_type', formWorkType);
      if (formSubject) formData.append('subject', formSubject);
      formFiles.forEach((f) => formData.append('files', f));
      await articlesApi.createArticle(formData);
      message.success('Статья опубликована');
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      resetForm();
      setView('list');
    } catch {
      message.error('Ошибка создания статьи');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormWorkType(undefined);
    setFormSubject(undefined);
    setFormFiles([]);
  };

  const getAuthorName = (author: Article['author']) => {
    if (author.first_name || author.last_name) {
      return `${author.first_name} ${author.last_name}`.trim();
    }
    return author.username;
  };

  if (view === 'create') {
    return (
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => { resetForm(); setView('list'); }}
          style={{ marginBottom: 16 }}
        >
          Назад к статьям
        </Button>
        <Title level={3}>Новая статья</Title>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text strong>Название статьи *</Text>
              <Input
                size="large"
                placeholder="Введите название"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={300}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>Тип работы</Text>
              <Select
                placeholder="Выберите тип"
                allowClear
                value={formWorkType}
                onChange={setFormWorkType}
                style={{ width: '100%', marginTop: 4 }}
                size="large"
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase()) ?? false
                }
              >
                {workTypes.map((wt) => (
                  <Select.Option key={wt.id} value={wt.name}>
                    {wt.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <Text strong>Предмет</Text>
              <Select
                placeholder="Выберите предмет"
                allowClear
                value={formSubject}
                onChange={setFormSubject}
                style={{ width: '100%', marginTop: 4 }}
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
            </div>
            <div>
              <Text strong>Описание статьи *</Text>
              <TextArea
                rows={8}
                placeholder="Напишите содержание..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>Файлы</Text>
              <div style={{ marginTop: 4 }}>
                <Upload
                  beforeUpload={(file) => { setFormFiles((prev) => [...prev, file]); return false; }}
                  showUploadList={false}
                  multiple
                >
                  <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
                </Upload>
                {formFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {formFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileOutlined />
                        <span style={{ flex: 1 }}>{f.name}</span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => setFormFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => { resetForm(); setView('list'); }}>Отмена</Button>
              <Button type="primary" loading={submitting} onClick={handleCreate}>
                Опубликовать
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (view === 'detail') {
    if (detailLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      );
    }
    if (!articleDetail) {
      return <Empty description="Статья не найдена" />;
    }
    return (
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setView('list')}
          style={{ marginBottom: 16 }}
        >
          Назад к статьям
        </Button>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <Title level={3} style={{ marginBottom: 0 }}>
              {articleDetail.title}
            </Title>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setDeleteArticleId(articleDetail.id);
                setDeleteModalOpen(true);
              }}
            >
              Удалить с причиной
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, color: '#888' }}>
            <span><UserOutlined /> {getAuthorName(articleDetail.author)}</span>
            <span><ClockCircleOutlined /> {dayjs(articleDetail.created_at).format('D MMMM YYYY, HH:mm')}</span>
            <span><EyeOutlined /> {articleDetail.views_count}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {articleDetail.work_type && <Tag color="blue">{articleDetail.work_type}</Tag>}
            {articleDetail.subject && <Tag color="green">{articleDetail.subject}</Tag>}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 15 }}>
            {articleDetail.description}
          </div>
          {articleDetail.files && articleDetail.files.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title level={5}><FileOutlined /> Файлы</Title>
              {articleDetail.files.map((f) => (
                <div key={f.id} style={{ marginBottom: 4 }}>
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                    <FileOutlined /> {f.original_name}
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const renderArticlesList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 0 }}>Статьи</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setView('create')}>
          Написать статью
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <Search
          placeholder="Поиск..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Select
          placeholder="Тип работы"
          allowClear
          value={selectedWorkType}
          onChange={setSelectedWorkType}
          style={{ width: 180 }}
        >
          {workTypes.map((wt) => (
            <Select.Option key={wt.id} value={wt.name}>{wt.name}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Предмет"
          allowClear
          value={selectedSubject}
          onChange={setSelectedSubject}
          style={{ width: 180 }}
          showSearch
          filterOption={(input, option) =>
            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
          }
        >
          {subjects.map((s) => (
            <Select.Option key={s.id} value={s.name}>{s.name}</Select.Option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : articles.length === 0 ? (
        <Empty description="Статей пока нет" />
      ) : (
        articles.map((article) => (
          <Card
            key={article.id}
            hoverable
            style={{ marginBottom: 12, borderRadius: 8 }}
            onClick={() => { setSelectedArticleId(article.id); setView('detail'); }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ marginBottom: 4 }}>{article.title}</Title>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#888', marginBottom: 8 }}>
                  <span><UserOutlined /> {getAuthorName(article.author)}</span>
                  <span><ClockCircleOutlined /> {dayjs(article.created_at).fromNow()}</span>
                  <span><EyeOutlined /> {article.views_count}</span>
                  {(article.files_count ?? 0) > 0 && <span><FileOutlined /> {article.files_count}</span>}
                </div>
                <Text type="secondary" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.description}
                </Text>
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {article.work_type && <Tag color="blue">{article.work_type}</Tag>}
                  {article.subject && <Tag color="green">{article.subject}</Tag>}
                </div>
              </div>
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteArticleId(article.id);
                  setDeleteModalOpen(true);
                }}
              />
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const renderComplaintsList = () => (
    <div>
      <Title level={4}>Жалобы на статьи</Title>
      {complaints.length === 0 ? (
        <Empty description="Жалоб нет" />
      ) : (
        complaints.map((complaint) => (
          <Card key={complaint.id} style={{ marginBottom: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Tag color={complaint.status === 'pending' ? 'orange' : complaint.status === 'article_deleted' ? 'red' : 'green'}>
                    {STATUS_LABELS[complaint.status] || complaint.status}
                  </Tag>
                  <Tag>{REASON_LABELS[complaint.reason] || complaint.reason}</Tag>
                </div>
                <Title level={5} style={{ marginBottom: 4 }}>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  Жалоба на: {complaint.article_title}
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  <UserOutlined /> {getAuthorName(complaint.complainant)} &bull; {dayjs(complaint.created_at).format('D MMMM YYYY, HH:mm')}
                </Text>
                <Text>{complaint.description}</Text>
              </div>
              {complaint.status === 'pending' && complaint.article && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setDeleteArticleId(complaint.article!);
                    setDeleteComplaintId(complaint.id);
                    setDeleteModalOpen(true);
                  }}
                >
                  Удалить статью
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const renderDeletionsList = () => (
    <div>
      <Title level={4}>Удалённые статьи / Оспаривания</Title>
      {deletions.length === 0 ? (
        <Empty description="Нет удалённых статей" />
      ) : (
        deletions.map((deletion) => (
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
                <Title level={5} style={{ marginBottom: 4 }}>{deletion.article_title}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Автор: {getAuthorName(deletion.author)} &bull; Удалена: {dayjs(deletion.created_at).format('D MMMM YYYY, HH:mm')}
                </Text>
                <Text strong>Причина удаления: </Text>
                <Text>{deletion.reason}</Text>
                {deletion.dispute_message && (
                  <div style={{ marginTop: 8, padding: 12, background: '#fff7e6', borderRadius: 6 }}>
                    <Text strong style={{ color: '#d48806' }}>Оспаривание автора: </Text>
                    <Text>{deletion.dispute_message}</Text>
                  </div>
                )}
                {deletion.admin_final_response && (
                  <div style={{ marginTop: 8, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                    <Text strong style={{ color: '#389e0d' }}>Решение: </Text>
                    <Text>{deletion.admin_final_response}</Text>
                  </div>
                )}
              </div>
              {deletion.status === 'disputed' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setResolveDeletionId(deletion.id);
                    setResolveModalOpen(true);
                  }}
                >
                  Рассмотреть
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div>
      <Title level={3} style={{ marginBottom: 20 }}>База Знаний</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'articles',
            label: 'Статьи',
            children: renderArticlesList(),
          },
          {
            key: 'complaints',
            label: (
              <Badge count={pendingComplaints.length} offset={[10, 0]}>
                Жалобы
              </Badge>
            ),
            children: renderComplaintsList(),
          },
          {
            key: 'deletions',
            label: (
              <Badge count={disputedDeletions.length} offset={[10, 0]}>
                Удалённые / Споры
              </Badge>
            ),
            children: renderDeletionsList(),
          },
        ]}
      />

      <Modal
        title="Удалить статью"
        open={deleteModalOpen}
        onCancel={() => { setDeleteModalOpen(false); setDeleteReason(''); setDeleteComplaintId(undefined); }}
        onOk={handleDeleteWithReason}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        confirmLoading={deleteLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text>Автору будет отправлено уведомление с причиной удаления. Автор сможет оспорить удаление.</Text>
          <div>
            <Text strong>Причина удаления *</Text>
            <TextArea
              rows={4}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Укажите причину удаления..."
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Рассмотреть оспаривание"
        open={resolveModalOpen}
        onCancel={() => { setResolveModalOpen(false); setResolveResponse(''); }}
        onOk={handleResolveDispute}
        okText="Принять решение"
        cancelText="Отмена"
        confirmLoading={resolveLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text strong>Решение</Text>
            <Select
              value={resolveDecision}
              onChange={setResolveDecision}
              style={{ width: '100%', marginTop: 4 }}
            >
              <Select.Option value="upheld">Подтвердить удаление</Select.Option>
              <Select.Option value="restored">Восстановить статью</Select.Option>
            </Select>
          </div>
          <div>
            <Text strong>Комментарий</Text>
            <TextArea
              rows={3}
              value={resolveResponse}
              onChange={(e) => setResolveResponse(e.target.value)}
              placeholder="Комментарий к решению..."
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
