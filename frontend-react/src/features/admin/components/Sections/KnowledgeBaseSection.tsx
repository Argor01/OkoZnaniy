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
  Popconfirm,
  Upload,
  message,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileOutlined,
  DeleteOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  articlesApi,
  type Article,
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

type View = 'list' | 'create' | 'detail';

export const KnowledgeBaseSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
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
    enabled: view === 'list',
  });

  const { data: articleDetail, isLoading: detailLoading } = useQuery<Article>({
    queryKey: ['knowledge-article', selectedArticleId],
    queryFn: () => articlesApi.getArticle(selectedArticleId!),
    enabled: view === 'detail' && !!selectedArticleId,
  });

  const handleDelete = async (id: number) => {
    try {
      await articlesApi.deleteArticle(id);
      message.success('Статья удалена');
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      setView('list');
    } catch {
      message.error('Не удалось удалить статью');
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
            <Popconfirm
              title="Удалить статью?"
              onConfirm={() => handleDelete(articleDetail.id)}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>Удалить</Button>
            </Popconfirm>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 0 }}>База Знаний</Title>
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
              <Popconfirm
                title="Удалить?"
                onConfirm={(e) => { e?.stopPropagation(); handleDelete(article.id); }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Да"
                cancelText="Нет"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
