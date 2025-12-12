import React, { useState } from 'react';
import { Card, Space, Row, Col, Input, InputNumber, Select, Typography, Button } from 'antd';
import { RichTextEditor } from '../../../../components/editor';
import { WorkFormProps, WorkFormData } from '../../types';
import styles from './WorkForm.module.css';

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
    tableOfContents: '',
    bibliography: '',
  });

  const handleSubmit = () => {
    // Простая валидация
    if (!formData.title || !formData.price || !formData.type || !formData.subject) {
      return;
    }
    onSave(formData);
  };

  return (
    <Card className={styles.card}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Название и цена */}
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
              className={styles.input}
              style={{ width: '100%' }}
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
              value={formData.subject}
              onChange={(value) => setFormData({ ...formData, subject: value })}
              className={styles.select}
            >
              <Option value="math">Математика</Option>
              <Option value="physics">Физика</Option>
              <Option value="chemistry">Химия</Option>
              <Option value="history">История</Option>
              <Option value="literature">Литература</Option>
            </Select>
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

        {/* Описание */}
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

        {/* Оглавление */}
        <div>
          <Text strong className={styles.label}>
            Оглавление
          </Text>
          <RichTextEditor
            value={formData.tableOfContents}
            onChange={(value) => setFormData({ ...formData, tableOfContents: value })}
            placeholder="Оглавление работы"
          />
        </div>

        {/* Список литературы */}
        <div>
          <Text strong className={styles.label}>
            Список литературы
          </Text>
          <RichTextEditor
            value={formData.bibliography}
            onChange={(value) => setFormData({ ...formData, bibliography: value })}
            placeholder="Список литературы"
          />
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
