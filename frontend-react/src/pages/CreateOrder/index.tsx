import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, DatePicker, Upload, Checkbox } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
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

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [showPromoCode, setShowPromoCode] = useState<boolean>(false);
  
  // Локальные списки для управления динамически добавляемыми элементами
  const [localSubjects, setLocalSubjects] = useState<any[]>([]);
  const [localWorkTypes, setLocalWorkTypes] = useState<any[]>([]);

  // Загружаем данные с API
  const { data: apiSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: catalogApi.getSubjects,
  });

  const { data: apiWorkTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['workTypes'],
    queryFn: catalogApi.getWorkTypes,
  });

  // Отладочная информация
  console.log('CreateOrder Debug:', {
    apiSubjects: apiSubjects.length,
    apiWorkTypes: apiWorkTypes.length,
    subjectsLoading,
    workTypesLoading,
    firstFewSubjects: apiSubjects.slice(0, 5).map(s => s.name),
    hasToken: !!localStorage.getItem('access_token'),
    tokenPreview: localStorage.getItem('access_token')?.substring(0, 10) + '...'
  });

  // Объединяем API данные с локально созданными
  const allSubjects = [...apiSubjects, ...localSubjects];
  const allWorkTypes = [...apiWorkTypes, ...localWorkTypes];

  // Функция для создания нового предмета
  const handleCreateSubject = async (name: string) => {
    try {
      console.log('🆕 Создаем новый предмет:', name);
      const newSubject = await catalogApi.createSubject(name);
      setLocalSubjects(prev => [...prev, newSubject]);
      message.success(`Предмет "${name}" добавлен`);
      return newSubject;
    } catch (error) {
      console.error('❌ Ошибка создания предмета:', error);
      message.error('Ошибка при создании предмета');
      throw error;
    }
  };

  // Функция для создания нового типа работы
  const handleCreateWorkType = async (name: string) => {
    try {
      console.log('🆕 Создаем новый тип работы:', name);
      const newWorkType = await catalogApi.createWorkType(name);
      setLocalWorkTypes(prev => [...prev, newWorkType]);
      message.success(`Тип работы "${name}" добавлен`);
      return newWorkType;
    } catch (error) {
      console.error('❌ Ошибка создания типа работы:', error);
      message.error('Ошибка при создании типа работы');
      throw error;
    }
  };

  // Мутация для создания заказа
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => ordersApi.createOrder(orderData),
    onSuccess: async (createdOrder) => {
      console.log('✅ Заказ создан:', createdOrder);
      
      // Если есть файлы, загружаем их
      if (fileList.length > 0) {
        message.loading('Загрузка файлов...', 0);
        let uploadedCount = 0;
        try {
          for (const file of fileList) {
            if (file.originFileObj) {
              await ordersApi.uploadOrderFile(createdOrder.id, file.originFileObj as File, {
                file_type: 'task',
                description: file.name
              });
              uploadedCount++;
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
        message.success('Заказ создан успешно!');
      }
      
      form.resetFields();
      setFileList([]);
      navigate('/orders-feed');
    },
    onError: (error: any) => {
      console.error('❌ Ошибка создания заказа:', error);
      const errorData = error?.response?.data;
      
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
    
    const orderData: any = {
      title: values.title,
      description: values.description,
      deadline: values.deadline?.format('YYYY-MM-DD'),
      budget: values.budget,
      payment_lock_days: values.payment_lock_days,
      plagiarism_check: values.plagiarism_check,
      private_notes: values.private_notes,
      promo_code: values.promo_code,
    };

    // Обработка предмета
    if (values.subject_id && typeof values.subject_id === 'number') {
      orderData.subject_id = values.subject_id;
    } else if (values.subject_id && typeof values.subject_id === 'string') {
      orderData.custom_subject = values.subject_id;
    }

    // Обработка типа работы
    if (values.work_type_id && typeof values.work_type_id === 'number') {
      orderData.work_type_id = values.work_type_id;
    } else if (values.work_type_id && typeof values.work_type_id === 'string') {
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
            payment_lock_days: 10,
            plagiarism_check: false,
          }}
        >
          {/* Основная секция заказа */}
          <div className={styles.orderSection}>
            {/* Название работы - большое поле */}
            <Form.Item
              name="title"
              rules={[{ required: true, message: 'Введите название работы' }]}
              className={styles.titleField}
            >
              <Input 
                placeholder="Введите название работы" 
                className={styles.titleInput}
              />
            </Form.Item>

            {/* Тип работы, предмет и дата в одной строке */}
            <div className={styles.typeSubjectDateRow}>
              <Form.Item
                name="work_type_id"
                rules={[{ required: true, message: 'Выберите тип работы' }]}
                className={styles.typeField}
              >
                <Select
                  placeholder="Тип работы"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    if (option && 'label' in option && typeof option.label === 'string') {
                      return option.label.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <Input.Search
                          placeholder="Добавить новый тип работы"
                          enterButton="Добавить"
                          onSearch={async (value) => {
                            if (value && value.trim()) {
                              const trimmedValue = value.trim();
                              const exists = allWorkTypes.find(wt => wt.name.toLowerCase() === trimmedValue.toLowerCase());
                              if (!exists) {
                                try {
                                  const newWorkType = await handleCreateWorkType(trimmedValue);
                                  form.setFieldValue('work_type_id', newWorkType.id);
                                } catch (error) {
                                  console.error('Ошибка создания типа работы:', error);
                                }
                              } else {
                                message.info('Такой тип работы уже существует');
                                form.setFieldValue('work_type_id', exists.id);
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  className={styles.selectField}
                >
                  {allWorkTypes.map((workType) => (
                    <Select.Option key={workType.id} value={workType.id} label={workType.name}>
                      {workType.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="subject_id"
                rules={[{ required: true, message: 'Выберите предмет' }]}
                className={styles.subjectField}
              >
                <Select
                  placeholder="Предмет"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    if (option && 'label' in option && typeof option.label === 'string') {
                      return option.label.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <Input.Search
                          placeholder="Добавить новый предмет"
                          enterButton="Добавить"
                          onSearch={async (value) => {
                            if (value && value.trim()) {
                              const trimmedValue = value.trim();
                              const exists = allSubjects.find(s => s.name.toLowerCase() === trimmedValue.toLowerCase());
                              if (!exists) {
                                try {
                                  const newSubject = await handleCreateSubject(trimmedValue);
                                  form.setFieldValue('subject_id', newSubject.id);
                                } catch (error) {
                                  console.error('Ошибка создания предмета:', error);
                                }
                              } else {
                                message.info('Такой предмет уже существует');
                                form.setFieldValue('subject_id', exists.id);
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                  className={styles.selectField}
                >
                  {allSubjects.map((subject) => (
                    <Select.Option key={subject.id} value={subject.id} label={subject.name}>
                      {subject.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="deadline"
                rules={[
                  { required: true, message: 'Выберите дату сдачи' },
                  {
                    validator: (_, value) => {
                      if (value && value.isBefore(dayjs(), 'day')) {
                        return Promise.reject(new Error('Дедлайн не может быть в прошлом'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
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
            <div className={styles.descriptionSection}>
              <div className={styles.descriptionLabel}>Описание работы</div>
              <Form.Item
                name="description"
                rules={[{ required: true, message: 'Введите описание работы' }]}
                className={styles.descriptionField}
              >
                <Input.TextArea
                  placeholder="Введите описание работы"
                  rows={6}
                  className={styles.descriptionTextarea}
                />
              </Form.Item>
            </div>

            {/* Приватные заметки */}
            <Form.Item
              name="private_notes"
              className={styles.privateNotesField}
            >
              <Input.TextArea
                placeholder="Поле, видимое только для вас"
                rows={3}
                className={styles.privateNotesTextarea}
              />
            </Form.Item>

            {/* Добавить файлы */}
            <Form.Item className={styles.filesField}>
              <Button 
                icon={<InboxOutlined />} 
                className={styles.addFilesButton}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      Array.from(files).forEach(file => {
                        const isLt10M = file.size < MAX_FILE_SIZE_BYTES;
                        if (!isLt10M) {
                          message.error(VALIDATION_MESSAGES.fileSize(MAX_FILE_SIZE_MB));
                          return;
                        }
                        
                        const uploadFile: UploadFile = {
                          uid: `${Date.now()}-${file.name}`,
                          name: file.name,
                          status: 'done',
                          size: file.size,
                          type: file.type,
                          originFileObj: file as any,
                        };
                        
                        setFileList(prev => [...prev, uploadFile]);
                      });
                    }
                  };
                  input.click();
                }}
              >
                Добавить файлы
              </Button>
              
              {fileList.length > 0 && (
                <div className={styles.filesList}>
                  {fileList.map(file => (
                    <div key={file.uid} className={styles.fileItem}>
                      <span>{file.name}</span>
                      <Button 
                        type="text" 
                        size="small"
                        onClick={() => setFileList(prev => prev.filter(f => f.uid !== file.uid))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
          </div>

          {/* Секция стоимости и параметров */}
          <div className={styles.priceSection}>
            {/* Стоимость и описание в одной строке */}
            <div className={styles.priceRow}>
              <Form.Item
                name="budget"
                rules={[
                  { required: true, message: 'Укажите стоимость' },
                  { type: 'number', min: 1, message: 'Стоимость должна быть больше 0' }
                ]}
                className={styles.priceFieldContainer}
              >
                <Input
                  placeholder="Стоимость"
                  type="number"
                  min={1}
                  className={styles.priceInput}
                />
              </Form.Item>
              
              <div className={styles.priceDescription}>
                Сумма, которую вы готовы заплатить эксперту
              </div>
            </div>

            {/* Срок блокировки оплаты */}
            <div className={styles.lockPeriodRow}>
              <div className={styles.lockPeriodLabel}>
                Срок блокировки оплаты
              </div>
              <Form.Item
                name="payment_lock_days"
                className={styles.lockPeriodField}
              >
                <Select className={styles.selectField}>
                  <Select.Option value={1}>1 день</Select.Option>
                  <Select.Option value={3}>3 дня</Select.Option>
                  <Select.Option value={5}>5 дней</Select.Option>
                  <Select.Option value={7}>7 дней</Select.Option>
                  <Select.Option value={10}>10 дней</Select.Option>
                  <Select.Option value={14}>14 дней</Select.Option>
                </Select>
              </Form.Item>
            </div>

            {/* Проверка на плагиат */}
            <Form.Item
              name="plagiarism_check"
              valuePropName="checked"
              className={styles.plagiarismField}
            >
              <Checkbox>Проверка на плагиат</Checkbox>
            </Form.Item>

            {/* Промокод */}
            <div className={styles.promoSection}>
              <Button 
                type="link" 
                className={styles.promoLink}
                onClick={() => setShowPromoCode(!showPromoCode)}
              >
                Есть промокод на скидку?
              </Button>
              
              {showPromoCode && (
                <Form.Item name="promo_code" className={styles.promoInput}>
                  <Input placeholder="Введите промокод" className={styles.promoInputField} />
                </Form.Item>
              )}
            </div>
          </div>

          {/* Кнопка отправки */}
          <Form.Item className={styles.submitSection}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createOrderMutation.isPending}
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