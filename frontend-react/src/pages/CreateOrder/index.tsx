import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, DatePicker, Space, InputNumber, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type CreateOrderRequest } from '../../api/orders';
import { catalogApi } from '../../api/catalog';
import { SUBJECTS } from '../../config/subjects';
import { WORK_TYPES } from '../../config/workTypes';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../../config/fileUpload';
import { VALIDATION_MESSAGES } from '../../config/validation';
import dayjs from 'dayjs';
import styles from './CreateOrder.module.css';

const { Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState<string>('');

  // Загружаем данные с API
  const { data: apiSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: catalogApi.getSubjects,
  });

  const { data: apiWorkTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['workTypes'],
    queryFn: catalogApi.getWorkTypes,
  });

  // Обработчик загрузки файлов
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      const isLt10M = file.size < MAX_FILE_SIZE_BYTES;
      if (!isLt10M) {
        message.error(VALIDATION_MESSAGES.fileSize(MAX_FILE_SIZE_MB));
        return false;
      }
      
      // Создаем правильную структуру UploadFile с originFileObj
      const uploadFile: UploadFile = {
        uid: file.uid || `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file as any, // Сохраняем оригинальный файл!
      };
      
      setFileList((prevList) => {
        const newList = [...prevList, uploadFile];
        console.log('📎 Файл добавлен:', file.name, 'originFileObj:', !!uploadFile.originFileObj, 'Всего файлов:', newList.length);
        return newList;
      });
      return false; // Предотвращаем автоматическую загрузку
    },
    onRemove: (file) => {
      setFileList((prevList) => {
        const newList = prevList.filter(f => f.uid !== file.uid);
        console.log('🗑️ Файл удален. Осталось файлов:', newList.length);
        return newList;
      });
    },
  };

  // Мутация для создания заказа
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => ordersApi.createOrder(orderData),
    onSuccess: async (createdOrder) => {
      console.log('✅ Заказ создан:', createdOrder);
      console.log('📎 Файлов в списке для загрузки:', fileList.length);
      
      // Если есть файлы, загружаем их
      if (fileList.length > 0) {
        message.loading('Загрузка файлов...', 0);
        let uploadedCount = 0;
        try {
          for (const file of fileList) {
            console.log('📤 Загружаем файл:', file.name, 'originFileObj:', !!file.originFileObj);
            if (file.originFileObj) {
              await ordersApi.uploadOrderFile(createdOrder.id, file.originFileObj as File, {
                file_type: 'task',
                description: file.name
              });
              uploadedCount++;
              console.log('✅ Файл загружен:', file.name);
            } else {
              console.warn('⚠️ Файл не имеет originFileObj:', file.name);
            }
          }
          message.destroy();
          message.success(`Заказ создан! Загружено файлов: ${uploadedCount}/${fileList.length}`);
        } catch (error) {
          console.error('❌ Ошибка загрузки файлов:', error);
          message.destroy();
          message.warning(`Заказ создан, но загружено только ${uploadedCount}/${fileList.length} файлов`);
        }
      } else {
        console.log('ℹ️ Файлов для загрузки нет');
        message.success('Заказ создан успешно!');
      }
      
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
            const fieldName = field === 'subject_id' ? 'Предмет' : 
                            field === 'work_type_id' ? 'Тип работы' : field;
            messages.forEach(msg => message.error(`${fieldName}: ${msg}`));
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
    const orderData: any = {
      title: values.title,
      description: values.description,
      deadline: values.deadline?.format('YYYY-MM-DD'),
      custom_topic: values.custom_topic,
      budget: values.budget,
    };

    // Если выбран существующий предмет из списка
    if (values.subject_id && typeof values.subject_id === 'number') {
      orderData.subject_id = values.subject_id;
    } 
    // Если введен новый предмет (строка)
    else if (values.subject_id && typeof values.subject_id === 'string') {
      orderData.custom_subject = values.subject_id;
    }

    // Аналогично для типа работы
    if (values.work_type_id && typeof values.work_type_id === 'number') {
      orderData.work_type_id = values.work_type_id;
    } 
    else if (values.work_type_id && typeof values.work_type_id === 'string') {
      orderData.custom_work_type = values.work_type_id;
    }
    
    console.log('📤 Данные для отправки:', orderData);
    createOrderMutation.mutate(orderData);
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
            rules={[{ required: true, message: 'Выберите или введите предмет' }]}
          >
            <Select
              placeholder="Выберите или введите предмет"
              showSearch
              mode="tags"
              maxCount={1}
              optionFilterProp="label"
              filterOption={(input, option) => {
                if (option && 'label' in option && typeof option.label === 'string') {
                  return option.label.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
              onChange={(value) => {
                // value будет массивом из-за mode="tags"
                if (Array.isArray(value) && value.length > 0) {
                  form.setFieldValue('subject_id', value[0]);
                }
              }}
            >
              {apiSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id} label={subject.name}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
            rules={[{ required: true, message: 'Выберите или введите тип работы' }]}
          >
            <Select
              placeholder="Выберите или введите тип работы"
              showSearch
              mode="tags"
              maxCount={1}
              optionFilterProp="label"
              filterOption={(input, option) => {
                if (option && 'label' in option && typeof option.label === 'string') {
                  return option.label.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
              onChange={(value) => {
                // value будет массивом из-за mode="tags"
                if (Array.isArray(value) && value.length > 0) {
                  form.setFieldValue('work_type_id', value[0]);
                }
              }}
            >
              {apiWorkTypes.map((workType) => (
                <Select.Option key={workType.id} value={workType.id} label={workType.name}>
                  {workType.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
            extra={`Максимальный размер файла: ${MAX_FILE_SIZE_MB} МБ. Поддерживаются документы, изображения, архивы`}
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
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createOrderMutation.isPending}
                className={styles.buttonPrimary}
              >
                Создать заказ
              </Button>
              <Button 
                onClick={() => form.resetFields()}
                className={styles.buttonSecondary}
              >
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
