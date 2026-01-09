import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, message, DatePicker, Space, InputNumber, Upload, Checkbox, TimePicker, Divider } from 'antd';
import { InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
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
  const [showPromoCode, setShowPromoCode] = useState<boolean>(false);
  
  // Локальные списки для управления динамически добавляемыми элементами
  const [localSubjects, setLocalSubjects] = useState<any[]>([]);
  const [localWorkTypes, setLocalWorkTypes] = useState<any[]>([]);

  // Загружаем данные с API
  const { data: apiSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: catalogApi.getSubjects,
    staleTime: 0, // Принудительно обновляем данные
    cacheTime: 0, // Не кешируем
  });

  const { data: apiWorkTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['workTypes'],
    queryFn: catalogApi.getWorkTypes,
    staleTime: 0, // Принудительно обновляем данные
    cacheTime: 0, // Не кешируем
  });

  // Отладочная информация
  console.log('CreateOrder Debug:', {
    apiSubjects: apiSubjects.length,
    apiWorkTypes: apiWorkTypes.length,
    subjectsLoading,
    workTypesLoading,
    firstFewSubjects: apiSubjects.slice(0, 5).map(s => s.name)
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
      budget: values.budget,
      payment_lock_days: values.payment_lock_days,
      plagiarism_check: values.plagiarism_check,
      uniqueness_percentage: values.uniqueness_percentage,
      private_notes: values.private_notes,
      promo_code: values.promo_code,
    };

    // Добавляем время к дедлайну если указано
    if (values.deadline_time) {
      const deadlineWithTime = values.deadline
        .hour(values.deadline_time.hour())
        .minute(values.deadline_time.minute());
      orderData.deadline = deadlineWithTime.format('YYYY-MM-DD HH:mm:ss');
    }

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
            deadline_time: dayjs().hour(23).minute(59),
            payment_lock_days: 10,
            plagiarism_check: false,
            uniqueness_percentage: 70,
          }}
        >
          {/* Секция стоимости и параметров */}
          <div className={styles.priceSection}>
            <div className={styles.priceRow}>
              <Form.Item
                name="budget"
                label={
                  <div className={styles.priceLabel}>
                    <span className={styles.rubleIcon}>₽</span>
                    <span>Стоимость</span>
                  </div>
                }
                rules={[
                  { required: true, message: 'Укажите стоимость' },
                  { type: 'number', min: 1, message: 'Стоимость должна быть больше 0' }
                ]}
                className={styles.priceInput}
              >
                <InputNumber
                  placeholder="Введите сумму"
                  min={1}
                  step={100}
                  precision={0}
                  className={styles.priceField}
                />
              </Form.Item>
              
              <div className={styles.priceDescription}>
                Сумма, которую вы готовы заплатить эксперту
              </div>
            </div>

            <div className={styles.parametersRow}>
              <div className={styles.parameterGroup}>
                <Form.Item
                  name="payment_lock_days"
                  label={
                    <div className={styles.labelWithIcon}>
                      Срок блокировки оплаты
                      <InfoCircleOutlined className={styles.infoIcon} />
                    </div>
                  }
                >
                  <Select className={styles.selectField}>
                    <Select.Option value={3}>3 дня</Select.Option>
                    <Select.Option value={5}>5 дней</Select.Option>
                    <Select.Option value={7}>7 дней</Select.Option>
                    <Select.Option value={10}>10 дней</Select.Option>
                    <Select.Option value={14}>14 дней</Select.Option>
                  </Select>
                </Form.Item>
              </div>

              <div className={styles.parameterGroup}>
                <Form.Item
                  name="plagiarism_check"
                  valuePropName="checked"
                  className={styles.checkboxField}
                >
                  <Checkbox>Проверка на плагиат</Checkbox>
                </Form.Item>
                
                <Form.Item
                  name="uniqueness_percentage"
                  className={styles.uniquenessField}
                >
                  <Select 
                    className={styles.selectField}
                    suffixIcon={<span className={styles.uniquenessLabel}>уникальность текста</span>}
                  >
                    <Select.Option value={60}>60%</Select.Option>
                    <Select.Option value={70}>70%</Select.Option>
                    <Select.Option value={80}>80%</Select.Option>
                    <Select.Option value={90}>90%</Select.Option>
                    <Select.Option value={95}>95%</Select.Option>
                  </Select>
                </Form.Item>
              </div>
            </div>

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
                  <Input placeholder="Введите промокод" />
                </Form.Item>
              )}
            </div>
          </div>

          <Divider className={styles.sectionDivider} />

          {/* Секция деталей заказа */}
          <div className={styles.orderSection}>
            <Title level={3} className={styles.sectionTitle}>
              Разместить заказ
            </Title>

            <Form.Item
              name="title"
              rules={[{ required: true, message: 'Введите название работы' }]}
            >
              <Input 
                placeholder="Введите название работы" 
                className={styles.titleInput}
              />
            </Form.Item>

            <div className={styles.typeRow}>
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
                  onSelect={async (value, option) => {
                    // Если выбрали существующий тип работы
                    if (typeof value === 'number') {
                      form.setFieldValue('work_type_id', value);
                    }
                  }}
                  onDeselect={() => {
                    form.setFieldValue('work_type_id', undefined);
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
                              // Проверяем, что такого типа работы еще нет
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
                  placeholder="Введите название предмета"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    if (option && 'label' in option && typeof option.label === 'string') {
                      return option.label.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                  onSearch={async (value) => {
                    // Если пользователь ввел текст, которого нет в списке
                    if (value && value.trim() && !allSubjects.find(s => s.name.toLowerCase() === value.toLowerCase())) {
                      console.log('🔍 Поиск предмета:', value);
                    }
                  }}
                  onSelect={async (value, option) => {
                    // Если выбрали существующий предмет
                    if (typeof value === 'number') {
                      form.setFieldValue('subject_id', value);
                    }
                  }}
                  onDeselect={() => {
                    form.setFieldValue('subject_id', undefined);
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
                              // Проверяем, что такого предмета еще нет
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
            </div>

            <div className={styles.deadlineRow}>
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

              <div className={styles.timeGroup}>
                <span className={styles.timeLabel}>Время сдачи</span>
                <div className={styles.timeInputs}>
                  <Form.Item name="deadline_time" className={styles.timeField}>
                    <TimePicker
                      format="HH:mm"
                      placeholder="ЧЧ:ММ"
                      className={styles.timeInput}
                    />
                  </Form.Item>
                </div>
              </div>
            </div>

            <div className={styles.templatesSection}>
              <Button className={styles.templatesButton}>
                ШАБЛОНЫ
              </Button>
            </div>

            <Form.Item
              name="description"
              rules={[{ required: true, message: 'Введите описание работы' }]}
              className={styles.descriptionField}
            >
              <div className={styles.editorContainer}>
                <div className={styles.editorToolbar}>
                  <Button type="text" className={styles.toolbarButton}><strong>B</strong></Button>
                  <Button type="text" className={styles.toolbarButton}><em>I</em></Button>
                  <Button type="text" className={styles.toolbarButton}>•</Button>
                  <Button type="text" className={styles.toolbarButton}>1.</Button>
                  <Button type="text" className={styles.toolbarButton}>H₁</Button>
                  <Button type="text" className={styles.toolbarButton}>🔗</Button>
                  <Button type="text" className={styles.toolbarButton}>Tₓ</Button>
                </div>
                <Input.TextArea
                  placeholder="Описание работы"
                  rows={8}
                  className={styles.descriptionTextarea}
                />
              </div>
            </Form.Item>

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

            <Form.Item
              name="files"
              className={styles.filesField}
            >
              <div className={styles.fileUploadSection}>
                <Button 
                  icon={<InboxOutlined />} 
                  className={styles.addFilesButton}
                  onClick={() => {
                    // Trigger file input
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
              </div>
            </Form.Item>

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
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CreateOrder;
