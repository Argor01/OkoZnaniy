import React, { useState } from 'react';
import { Card, Space, Row, Col, Input, InputNumber, Select, Typography, Button, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { RichTextEditor } from '../../../../components/editor';
import { WorkFormProps, WorkFormData } from '../../types';
import styles from './WorkForm.module.css';

const { Text } = Typography;
const { Option } = Select;

const WorkForm: React.FC<WorkFormProps> = ({ onSave, onCancel, subjects = [], workTypes = [] }) => {
  const [formData, setFormData] = useState<WorkFormData>({
    title: '',
    description: '',
    price: 0,
    subject: '',
    workType: '',
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.workType || !formData.subject) {
      message.error('Заполните все обязательные поля');
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

        {/* Тип и предмет */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Тип работы
            </Text>
            <Select
              placeholder="Выберите тип работы"
              value={formData.workType}
              onChange={(value) => setFormData({ ...formData, workType: value })}
              className={styles.select}
            >
              {workTypes.map((type: any) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text strong className={styles.label}>
              Предмет
            </Text>
            <Select
              placeholder="Выберите предмет"
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
              className={styles.select}
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {subjects.map((subject: any) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
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
            Превью работы (необязательно)
          </Text>
          <Input.TextArea
            placeholder="Краткое описание или превью работы"
            value={formData.preview}
            onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
            rows={3}
          />
        </div>

        {/* Загрузка файлов */}
        <div>
          <Text strong className={styles.label}>
            Файлы работы (необязательно)
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
              
              const fileData = {
                name: file.name,
                type: file.type || '',
                size: file.size,
              };
              
              setFormData({ 
                ...formData, 
                files: [...(formData.files || []), fileData] 
              });
              return false;
            }}
            onRemove={(file) => {
              setFormData({
                ...formData,
                files: (formData.files || []).filter((f, index) => index !== (formData.files || []).findIndex(item => item.name === file.name)),
              });
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
            <p className="ant-upload-hint">
              Поддерживаются документы (PDF, DOC, DOCX), изображения (JPG, PNG), архивы (ZIP, RAR)
            </p>
          </Upload.Dragger>
          {formData.files && formData.files.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Загружено файлов: {formData.files.length}</Text>
            </div>
          )}
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
