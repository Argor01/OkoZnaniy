import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Typography, message, DatePicker, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import styles from './CreateOrder.module.css';

const { Title } = Typography;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  console.log('CreateOrder component rendering');

  const onFinish = (values: any) => {
    const formData = {
      ...values,
      files: fileList
    };
    console.log('Form values:', formData);
    console.log('Files:', fileList);
    message.success('Форма отправлена (тестовый режим)');
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} bordered={false}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            Создать заказ
          </Title>
          <Button 
            className={styles.buttonSecondary}
            onClick={() => navigate('/orders-feed')}
          >
            К ленте заказов
          </Button>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            deadline: dayjs().add(7, 'day'),
          }}
        >
          {/* Основная секция заказа */}
          <div className={styles.orderSection}>
            {/* Название работы */}
            <Form.Item
              name="title"
              label="Название работы"
              rules={[{ required: true, message: 'Введите название работы' }]}
            >
              <Input 
                placeholder="Введите название работы" 
                className={styles.titleInput}
              />
            </Form.Item>

            {/* Простые поля без сложной логики */}
            <div className={styles.typeSubjectDateRow}>
              <Form.Item
                name="work_type"
                label="Тип работы"
                rules={[{ required: true, message: 'Выберите тип работы' }]}
                className={styles.typeField}
              >
                <Select placeholder="Тип работы" className={styles.selectField}>
                  <Select.Option value="essay">Эссе</Select.Option>
                  <Select.Option value="coursework">Курсовая работа</Select.Option>
                  <Select.Option value="diploma">Дипломная работа</Select.Option>
                  <Select.Option value="report">Отчет</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="subject"
                label="Предмет"
                rules={[{ required: true, message: 'Выберите предмет' }]}
                className={styles.subjectField}
              >
                <Select placeholder="Предмет" className={styles.selectField}>
                  <Select.Option value="math">Математика</Select.Option>
                  <Select.Option value="physics">Физика</Select.Option>
                  <Select.Option value="chemistry">Химия</Select.Option>
                  <Select.Option value="history">История</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="deadline"
                label="Дата сдачи"
                rules={[{ required: true, message: 'Выберите дату сдачи' }]}
                className={styles.dateField}
              >
                <DatePicker
                  placeholder="Дата сдачи"
                  format="DD.MM.YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  className={styles.dateInput}
                />
              </Form.Item>
            </div>

            {/* Описание работы */}
            <Form.Item
              name="description"
              label="Описание работы"
              rules={[{ required: true, message: 'Введите описание работы' }]}
            >
              <Input.TextArea
                placeholder="Введите описание работы"
                rows={6}
                className={styles.descriptionTextarea}
              />
            </Form.Item>

            {/* Стоимость */}
            <Form.Item
              name="budget"
              label="Стоимость (₽)"
              rules={[
                { required: true, message: 'Укажите стоимость' },
                { 
                  validator: (_, value) => {
                    if (value !== undefined && value !== null && Number(value) <= 0) {
                      return Promise.reject(new Error('Стоимость должна быть больше 0'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber
                placeholder="Стоимость"
                min={1}
                style={{ width: '100%' }}
                className={styles.priceInput}
              />
            </Form.Item>

            {/* Загрузка файлов */}
            <Form.Item
              name="files"
              label="Прикрепить файлы (необязательно)"
            >
              <Upload.Dragger
                name="files"
                multiple
                fileList={fileList}
                beforeUpload={(file) => {
                  const isLt10M = file.size < 10 * 1024 * 1024;
                  if (!isLt10M) {
                    message.error('Максимальный размер файла: 10 МБ');
                    return Upload.LIST_IGNORE as any;
                  }
                  
                  // Проверяем допустимые типы файлов
                  const allowedTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain',
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'application/zip',
                    'application/x-rar-compressed',
                  ];
                  
                  if (!allowedTypes.includes(file.type)) {
                    message.error('Неподдерживаемый тип файла');
                    return Upload.LIST_IGNORE as any;
                  }
                  
                  setFileList(prev => [...prev, file]);
                  return false; // Предотвращаем автоматическую загрузку
                }}
                onRemove={(file) => {
                  setFileList(prev => prev.filter(f => f.uid !== file.uid));
                }}
                className={styles.uploadArea}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
                <p className="ant-upload-hint">
                  Поддерживаются документы (PDF, DOC, DOCX), изображения (JPG, PNG), архивы (ZIP, RAR)
                </p>
              </Upload.Dragger>
            </Form.Item>
          </div>

          {/* Кнопка отправки */}
          <Form.Item className={styles.submitSection}>
            <Button 
              type="primary" 
              htmlType="submit" 
              className={styles.submitButton}
              size="large"
            >
              Создать заказ
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateOrder;