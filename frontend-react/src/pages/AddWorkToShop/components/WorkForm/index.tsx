import React, { useMemo, useState } from 'react';
import { Card, Space, Row, Col, Input, InputNumber, Select, Typography, Button, Upload, message } from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { RichTextEditor } from '../../../../components/editor';
import { WorkFormProps, WorkFormData } from '../../types';
import styles from './WorkForm.module.css';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../../../api/catalog';
import { mockSubjects } from '../../../ShopReadyWorks/mockData';

const { Text } = Typography;
const { Option } = Select;

const WorkForm: React.FC<WorkFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<WorkFormData>({
    title: '',
    price: 0,
    type: '',
    subject: '',
    language: 'russian',
    description: '',
  });

  const [customSubject, setCustomSubject] = useState('');
  const { data: subjects = [] } = useQuery({
    queryKey: ['catalog-subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });
  const subjectNames = useMemo(
    () => subjects.map((s: any) => s?.name).filter((n: string) => !!n),
    [subjects]
  );
  const subjectOptions = useMemo(() => {
    const base = mockSubjects
      .filter((s) => s !== 'Все предметы')
      .filter((s) => !/друг(ое|ие)/i.test(s));
    const fromApi = subjectNames.filter((s) => !/друг(ое|ие)/i.test(s));
    return Array.from(new Set([...base, ...fromApi]));
  }, [subjectNames]);

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.type || !formData.subject) {
      return;
    }
    onSave(formData);
  };

  return (
    <Card className={styles.card}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Название работы
            </Text>
            <Input
              placeholder="Введите название работы"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Стоимость работы
            </Text>
            <InputNumber
              placeholder="Введите стоимость работы"
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: value || 0 })}
              
              style={{ width: '120px' }}
              min={0}
              addonAfter="₽"
            />
          </Col>
        </Row>

        {/* Тип, предмет, язык */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Text strong className={styles.label}>
              Выбрать тип
            </Text>
            <Select
              placeholder="Выбрать тип"
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              className={styles.select}
            >
              <Option value="practical">Практическая работа</Option>
              <Option value="control">Контрольная работа</Option>
              <Option value="essay">Эссе</Option>
              <Option value="coursework">Курсовая работа</Option>
              <Option value="thesis">Дипломная работа</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong className={styles.label}>
              Выбрать предмет
            </Text>
            <Select
              placeholder="Выбрать предмет"
              value={
                !formData.subject
                  ? undefined
                  : subjectOptions.includes(formData.subject)
                    ? formData.subject
                    : 'other'
              }
              onChange={(value) => {
                setFormData({ ...formData, subject: value });
                if (value !== 'other') {
                  setCustomSubject('');
                } else {
                  setCustomSubject('');
                }
              }}
              className={styles.select}
            >
              {subjectOptions.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
              <Option value="other">Другое</Option>
            </Select>
            {(!subjectOptions.includes(formData.subject) && formData.subject !== '') && (
              <Input
                placeholder="Введите свой вариант"
                value={customSubject}
                onChange={e => {
                  setCustomSubject(e.target.value);
                  setFormData({ ...formData, subject: e.target.value });
                }}
                className={styles.input}
                style={{ marginTop: 20 }}
              />
            )}
          </Col>
          <Col xs={24} sm={8}>
            <Text strong className={styles.label}>
              Язык
            </Text>
            <Select
              value={formData.language}
              onChange={(value) => setFormData({ ...formData, language: value })}
              className={styles.select}
            >
              <Option value="russian">Русский</Option>
              <Option value="english">English</Option>
              <Option value="german">Deutsch</Option>
              <Option value="french">Français</Option>
            </Select>
          </Col>
        </Row>

        <div>
          <Text strong className={styles.label}>
            Подробное описание
          </Text>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Подробное описание вашей работы"
          />
        </div>

        <div>
          <Text strong className={styles.label}>
            Фото для карточки
          </Text>
          <Upload
            listType="picture-card"
            accept="image/*"
            maxCount={1}
            beforeUpload={(file) => {
              const preview = URL.createObjectURL(file);
              setFormData({ ...formData, coverImage: file, coverImagePreview: preview });
              return false;
            }}
            onRemove={() => {
              const next = { ...formData };
              delete next.coverImage;
              delete next.coverImagePreview;
              setFormData(next);
            }}
            fileList={
              formData.coverImage
                ? [
                    {
                      uid: 'cover',
                      name: formData.coverImage.name || 'cover',
                      status: 'done',
                      url: formData.coverImagePreview,
                    } as any,
                  ]
                : []
            }
          >
            {!formData.coverImage && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Загрузить</div>
              </div>
            )}
          </Upload>
        </div>

        {/* Загрузка файлов (стиль как в CreateOrder) */}
        <div>
          <Text strong className={styles.label}>
            Файлы работы
          </Text>
          <Upload.Dragger
            name="files"
            multiple
            className={styles.uploadArea}
            beforeUpload={(file) => {
              const isLt10M = file.size < 10 * 1024 * 1024;
              if (!isLt10M) {
                message.error('Максимальный размер файла: 10 МБ');
                return Upload.LIST_IGNORE as any;
              }
              const uploadFile: UploadFile = {
                uid: file.uid || `${Date.now()}-${file.name}`,
                name: file.name,
                status: 'done',
                size: file.size,
                type: file.type,
                originFileObj: file as any,
                url: URL.createObjectURL(file),
              };
              setFormData({ ...formData, files: [ ...(formData.files as UploadFile[] || []), uploadFile ] });
              return false;
            }}
            onRemove={(file) => {
              setFormData({
                ...formData,
                files: (formData.files as UploadFile[] || []).filter((f) => f.uid !== file.uid),
              });
            }}
            fileList={(formData.files as UploadFile[]) || []}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
            <p className="ant-upload-hint">
              Поддерживаются документы (PDF, DOC, DOCX), изображения (JPG, PNG), архивы (ZIP, RAR)
            </p>
          </Upload.Dragger>
        </div>

        {/* Кнопки */}
        <div className={styles.actions}>
          <Button onClick={onCancel} className={styles.cancelButton}>
            Отмена
          </Button>
          <Button type="primary" onClick={handleSubmit} className={styles.saveButton}>
            Сохранить
          </Button>
        </div>
      </Space>
    </Card>
  );
};

export default WorkForm;
