import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, DatePicker, Space, InputNumber, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type CreateOrderRequest } from '../api/orders';
import { catalogApi } from '../api/catalog';
import { SUBJECTS } from '../config/subjects';
import { WORK_TYPES } from '../config/workTypes';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [showCustomSubject, setShowCustomSubject] = useState<boolean>(false);
  const [showCustomWorkType, setShowCustomWorkType] = useState<boolean>(false);

  // Загружаем данные с API, используем константы как fallback
  const { data: apiSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: catalogApi.getSubjects,
  });

  const { data: apiWorkTypes, isLoading: workTypesLoading } = useQuery({
    queryKey: ['workTypes'],
    queryFn: catalogApi.getWorkTypes,
  });

  // Используем данные с API если есть, иначе константы
  const subjects = apiSubjects && apiSubjects.length > 0 ? apiSubjects : SUBJECTS;
  const workTypes = apiWorkTypes && apiWorkTypes.length > 0 ? apiWorkTypes : WORK_TYPES;

  // Обработчик загрузки файлов
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('Файл должен быть меньше 10MB!');
        return false;
      }
      setFileList([...fileList, file as UploadFile]);
      return false; // Предотвращаем автоматическую загрузку
    },
    onRemove: (file) => {
      setFileList(fileList.filter(f => f.uid !== file.uid));
    },
  };

  // Мутация для создания заказа
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => ordersApi.createOrder(orderData),
    onSuccess: () => {
      message.success('Заказ создан успешно! Он появится в ленте заказов.');
      form.resetFields();
      setFileList([]);
      navigate('/orders-feed');
    },
    onError: (error: any) => {
      console.error('❌ Ошибка создания заказа:', error);
      console.error('📋 Детали ошибки:', error?.response?.data);
      
      const errorData = error?.response?.data;
      
      // Если есть детальные ошибки по полям
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach(msg => message.error(`${field}: ${msg}`));
          } else {
            message.error(`${field}: ${messages}`);
          }
        });
      } else {
        const errorMessage = error?.response?.data?.detail || 'Ошибка создания заказа';
        message.error(errorMessage);
      }
    },
  });

  const onFinish = (values: any) => {
    console.log('📝 Отправка заказа:', values);
    
    // Формируем данные заказа
    const orderData: CreateOrderRequest = {
      title: values.title,
      description: values.description,
      deadline: values.deadline?.format('YYYY-MM-DD'), // Только дата
      subject_id: showCustomSubject ? undefined : values.subject_id,
      custom_topic: values.custom_topic,
      work_type_id: showCustomWorkType ? undefined : values.work_type_id,
      budget: values.budget,
    };
    
    // Добавляем кастомные поля если они есть
    if (showCustomSubject && values.custom_subject) {
      (orderData as any).custom_subject = values.custom_subject;
    }
    if (showCustomWorkType && values.custom_work_type) {
      (orderData as any).custom_work_type = values.custom_work_type;
    }
    
    console.log('📤 Данные для отправки:', orderData);
    createOrderMutation.mutate(orderData);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Создать заказ
          </Title>
          <Button 
            type="default" 
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
          <Form.Item
            name="title"
            label="Название заказа"
            rules={[{ required: true, message: 'Введите название заказа' }]}
          >
            <Input placeholder="Например: Курсовая работа по экономике" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание задания"
            rules={[{ required: true, message: 'Введите описание задания' }]}
          >
            <TextArea
              rows={4}
              placeholder="Подробно опишите задание, требования, объем работы..."
            />
          </Form.Item>

          <Form.Item
            name="subject_id"
            label="Предмет"
            rules={[{ required: !showCustomSubject, message: 'Выберите предмет' }]}
          >
            <Select
              placeholder="Выберите предмет"
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) => {
                if (option && 'label' in option && typeof option.label === 'string') {
                  return option.label.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
              onChange={(value) => {
                if (value === 'other') {
                  setShowCustomSubject(true);
                  form.setFieldValue('subject_id', undefined);
                } else {
                  setShowCustomSubject(false);
                }
              }}
            >
              {subjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
              <Select.Option value="other">Другое</Select.Option>
            </Select>
          </Form.Item>

          {showCustomSubject && (
            <Form.Item
              name="custom_subject"
              label="Укажите свой предмет"
              rules={[{ required: true, message: 'Введите название предмета' }]}
            >
              <Input placeholder="Введите название предмета" />
            </Form.Item>
          )}

          <Form.Item
            name="custom_topic"
            label="Тема"
            rules={[{ required: true, message: 'Введите тему' }]}
          >
            <Input placeholder="Введите тему работы" />
          </Form.Item>

          <Form.Item
            name="work_type_id"
            label="Тип работы"
            rules={[{ required: !showCustomWorkType, message: 'Выберите тип работы' }]}
          >
            <Select
              placeholder="Выберите тип работы"
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) => {
                if (option && 'label' in option && typeof option.label === 'string') {
                  return option.label.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
              onChange={(value) => {
                if (value === 'other') {
                  setShowCustomWorkType(true);
                  form.setFieldValue('work_type_id', undefined);
                } else {
                  setShowCustomWorkType(false);
                }
              }}
            >
              {workTypes.map((workType) => (
                <Select.Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Select.Option>
              ))}
              <Select.Option value="other">Другое</Select.Option>
            </Select>
          </Form.Item>

          {showCustomWorkType && (
            <Form.Item
              name="custom_work_type"
              label="Укажите свой тип работы"
              rules={[{ required: true, message: 'Введите тип работы' }]}
            >
              <Input placeholder="Введите тип работы" />
            </Form.Item>
          )}

          <Form.Item
            name="budget"
            label="Желаемая цена (₽)"
            rules={[
              { required: true, message: 'Укажите желаемую цену' },
              { type: 'number', min: 1, message: 'Цена должна быть больше 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Введите желаемую цену"
              min={1}
              step={100}
              precision={0}
            />
          </Form.Item>


          <Form.Item
            name="deadline"
            label="Срок выполнения"
            rules={[
              { required: true, message: 'Выберите срок выполнения' },
              {
                validator: (_, value) => {
                  if (value && value.isBefore(dayjs(), 'day')) {
                    return Promise.reject(new Error('Дедлайн не может быть в прошлом'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="files"
            label="Прикрепить файлы"
            extra="Максимальный размер файла: 10 МБ. Поддерживаются документы, изображения, архивы"
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
              <p className="ant-upload-hint">
                Поддерживаются документы (PDF, DOC, DOCX), изображения (JPG, PNG), архивы (ZIP, RAR)
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createOrderMutation.isPending}>
                Создать заказ
              </Button>
              <Button onClick={() => form.resetFields()}>
                Очистить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateOrder;
