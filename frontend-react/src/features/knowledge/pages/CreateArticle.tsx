import React, { useState } from 'react';
import { Typography, Card, Input, Select, Button, Upload, message } from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../api/knowledgeApi';
import { catalogApi, type WorkType, type Subject } from '@/features/common/api/catalog';
import styles from './CreateArticle.module.css';

const { Title } = Typography;
const { TextArea } = Input;

const CreateArticle: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<string | undefined>();
  const [subject, setSubject] = useState<string | undefined>();
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ['work-types'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const handleFileSelect = (file: File) => {
    setFiles((prev) => [...prev, file]);
    return false;
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.error('Укажите название статьи');
      return;
    }
    if (!description.trim()) {
      message.error('Укажите описание статьи');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (workType) formData.append('work_type', workType);
      if (subject) formData.append('subject', subject);
      files.forEach((f) => formData.append('files', f));

      const article = await articlesApi.createArticle(formData);
      message.success('Статья опубликована!');
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      navigate(`/knowledge-base/${article.id}`);
    } catch {
      message.error('Не удалось создать статью');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Title level={3}>Новая статья</Title>

        <div className={styles.form}>
          <div>
            <label className={`${styles.label} ${styles.required}`}>
              Название статьи
            </label>
            <Input
              size="large"
              placeholder="Введите название статьи"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
          </div>

          <div>
            <label className={styles.label}>Тип работы</label>
            <Select
              placeholder="Выберите тип работы"
              allowClear
              value={workType}
              onChange={setWorkType}
              style={{ width: '100%' }}
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
            <label className={styles.label}>Предмет</label>
            <Select
              placeholder="Выберите предмет"
              allowClear
              value={subject}
              onChange={setSubject}
              style={{ width: '100%' }}
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
            <label className={`${styles.label} ${styles.required}`}>
              Описание статьи
            </label>
            <TextArea
              placeholder="Напишите содержание статьи..."
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={styles.label}>Прикрепить файлы</label>
            <Upload
              beforeUpload={handleFileSelect}
              showUploadList={false}
              multiple
              className={styles.uploadArea}
            >
              <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
            </Upload>

            {files.length > 0 && (
              <div className={styles.fileList}>
                {files.map((file, idx) => (
                  <div key={idx} className={styles.fileItem}>
                    <FileOutlined />
                    <span className={styles.fileItemName}>{file.name}</span>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveFile(idx)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.submitRow}>
            <Button size="large" onClick={() => navigate('/knowledge-base')}>
              Отмена
            </Button>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
            >
              Опубликовать
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CreateArticle;
