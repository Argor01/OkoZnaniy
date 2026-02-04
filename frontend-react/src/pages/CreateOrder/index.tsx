import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Typography, message, DatePicker, Upload, Modal } from 'antd';
import { InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { catalogApi } from '../../api/catalog';
import { ordersApi } from '../../api/orders';
import dayjs from 'dayjs';
import styles from './CreateOrder.module.css';

const { Title } = Typography;

const ALLOWED_FILE_EXTENSIONS = [
  'doc', 'docx', 'pdf', 'rtf', 'txt',
  'ppt', 'pptx',
  'xls', 'xlsx', 'csv',
  'dwg', 'dxf', 'cdr', 'cdw', 'bak',
  'jpg', 'jpeg', 'png', 'bmp', 'svg',
];

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [newWorkTypeModalVisible, setNewWorkTypeModalVisible] = useState(false);
  const [newSubjectModalVisible, setNewSubjectModalVisible] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  // Загрузка данных из API
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Мутации для создания новых типов работ и предметов
  const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
      setNewWorkTypeName('');
      message.success('Новый тип работы добавлен');
    },
    onError: () => {
      message.error('Ошибка при добавлении типа работы');
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      setNewSubjectName('');
      message.success('Новый предмет добавлен');
    },
    onError: () => {
      message.error('Ошибка при добавлении предмета');
    },
  });

  // Мутация для создания заказа (редирект делаем в onFinish после загрузки всех файлов)
  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.createOrder(data),
    onSuccess: () => {
      message.success('Заказ успешно создан!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      console.error('Ошибка создания заказа:', error);
      message.error('Ошибка при создании заказа. Попробуйте еще раз.');
    },
  });

  const onFinish = async (values: any) => {
    try {
      const orderData = {
        title: values.title,
        description: values.description,
        deadline: values.deadline.format('YYYY-MM-DD'),
        subject_id: values.subject,
        work_type_id: values.work_type,
        budget: values.budget,
        custom_topic: values.title,
      };

      const createdOrder = await createOrderMutation.mutateAsync(orderData);

      if (fileList.length > 0) {
        const total = fileList.length;
        for (let i = 0; i < fileList.length; i++) {
          const item = fileList[i];
          // Ant Design Upload хранит реальный File в originFileObj
          const rawFile = (item as any)?.originFileObj ?? item;
          if (!(rawFile instanceof File)) {
            message.warning(`Файл ${i + 1}: неверный объект, пропуск`);
            continue;
          }
          try {
            await ordersApi.uploadOrderFile(createdOrder.id, rawFile, {
              file_type: 'task',
              description: 'Файл задания'
            });
            if (total > 1) {
              message.loading({ content: `Загружено файлов: ${i + 1} из ${total}`, key: 'upload', duration: 0 });
            }
          } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            const errMsg = (error as any)?.response?.data?.detail || (error as any)?.response?.data?.file?.[0] || (error as Error)?.message;
            message.warning({ content: `${rawFile.name}: ${errMsg || 'ошибка загрузки'}`, key: 'uploadErr' });
          }
        }
        if (total > 1) {
          message.destroy('upload');
        }
        queryClient.invalidateQueries({ queryKey: ['order', String(createdOrder.id)] });
      }

      navigate(`/orders/${createdOrder.id}`, { state: { from: '/orders-feed' } });
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
    }
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
                <Select 
                  placeholder="Тип работы" 
                  className={styles.selectField}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => setNewWorkTypeModalVisible(true)}
                          style={{ width: '100%', textAlign: 'left' }}
                        >
                          Добавить новый тип работы
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {workTypes.map((type: any) => (
                    <Select.Option key={type.id} value={type.id}>
                      {type.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="subject"
                label="Предмет"
                rules={[{ required: true, message: 'Выберите предмет' }]}
                className={styles.subjectField}
              >
                <Select 
                  placeholder="Предмет" 
                  className={styles.selectField}
                  showSearch
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => setNewSubjectModalVisible(true)}
                          style={{ width: '100%', textAlign: 'left' }}
                        >
                          Добавить новый предмет
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {subjects.map((subject: any) => (
                    <Select.Option key={subject.id} value={subject.id}>
                      {subject.name}
                    </Select.Option>
                  ))}
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
                  
                  const ext = file.name.split('.').pop()?.toLowerCase() || '';
                  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                    message.error('Неподдерживаемый формат файла');
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
                  Допустимые форматы: .doc, .docx, .pdf, .rtf, .txt, .ppt, .pptx, .xls, .xlsx, .csv, .dwg, .dxf, .cdr, .cdw, .bak, .jpg, .png, .bmp, .svg
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
              loading={createOrderMutation.isPending}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? 'Создание заказа...' : 'Создать заказ'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Модальное окно для добавления нового типа работы */}
      <Modal
        title="Добавить новый тип работы"
        open={newWorkTypeModalVisible}
        onOk={() => {
          if (newWorkTypeName.trim()) {
            createWorkTypeMutation.mutate(newWorkTypeName.trim());
          } else {
            message.error('Введите название типа работы');
          }
        }}
        onCancel={() => {
          setNewWorkTypeModalVisible(false);
          setNewWorkTypeName('');
        }}
        confirmLoading={createWorkTypeMutation.isPending}
      >
        <Input
          placeholder="Название типа работы"
          value={newWorkTypeName}
          onChange={(e) => setNewWorkTypeName(e.target.value)}
          onPressEnter={() => {
            if (newWorkTypeName.trim()) {
              createWorkTypeMutation.mutate(newWorkTypeName.trim());
            }
          }}
        />
      </Modal>

      {/* Модальное окно для добавления нового предмета */}
      <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          if (newSubjectName.trim()) {
            createSubjectMutation.mutate(newSubjectName.trim());
          } else {
            message.error('Введите название предмета');
          }
        }}
        onCancel={() => {
          setNewSubjectModalVisible(false);
          setNewSubjectName('');
        }}
        confirmLoading={createSubjectMutation.isPending}
      >
        <Input
          placeholder="Название предмета"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onPressEnter={() => {
            if (newSubjectName.trim()) {
              createSubjectMutation.mutate(newSubjectName.trim());
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default CreateOrder;