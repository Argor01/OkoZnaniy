import React, { useRef, useState } from 'react';
import { Form, Typography, message, Modal } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined, PlusOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { catalogApi } from '@/features/common/api/catalog';
import { ordersApi } from '@/features/orders/api/orders';
import { Subject, WorkType } from '@/features/common/types/catalog';
import { CreateOrderRequest } from '@/features/orders/types/orders';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { AppUpload } from '@/components/ui/AppUpload';

import styles from './CreateOrder.module.css';

const { Title } = Typography;

interface CreateOrderFormValues {
  title: string;
  description: string;
  deadline: dayjs.Dayjs;
  subject: number;
  work_type: number;
  budget: number;
  client_note?: string;
}

interface DeadlineTimeValues {
  hours: number;
  minutes: number;
}

const ALLOWED_FILE_EXTENSIONS = [
  'doc', 'docx', 'pdf', 'rtf', 'txt',
  'ppt', 'pptx',
  'xls', 'xlsx', 'csv',
  'dwg', 'dxf', 'cdr', 'cdw', 'bak',
  'jpg', 'jpeg', 'png', 'bmp', 'svg',
  'zip', 'rar', '7z',
];

const MAX_ORDER_BUDGET = 99_999_999.99;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
    const [form] = Form.useForm<CreateOrderFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const [newWorkTypeModalVisible, setNewWorkTypeModalVisible] = useState(false);
  const [newSubjectModalVisible, setNewSubjectModalVisible] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [deadlineTime, setDeadlineTime] = useState<DeadlineTimeValues>({ hours: 12, minutes: 0 });
  const submitGuardRef = useRef(false);

  const lockSubmit = () => {
    submitGuardRef.current = true;
    setSubmitLocked(true);
  };

  const unlockSubmit = () => {
    submitGuardRef.current = false;
    setSubmitLocked(false);
  };

  
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  const sortedSubjects = [...subjects].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
  );

  const sortedWorkTypes = [...workTypes].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
  );

  
    const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
      setNewWorkTypeName('');
      message.success('Новый тип работы добавлен');
      // Автоматически выбираем созданный тип работы
      if (data?.id) {
        form.setFieldValue('work_type', data.id);
      }
    },
    onError: () => {
      message.error('Ошибка при добавлении типа работы');
    },
  });

    const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      setNewSubjectName('');
      message.success('Новый предмет добавлен');
      // Автоматически выбираем созданный предмет
      if (data?.id) {
        form.setFieldValue('subject', data.id);
      }
    },
    onError: () => {
      message.error('Ошибка при добавлении предмета');
    },
  });

  
  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.createOrder(data),
    onSuccess: () => {
      message.success('Заказ успешно создан!');
      // Инвалидируем все связанные с заказами запросы
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-feed'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (error: Error) => {
      console.error('Ошибка создания заказа:', error);
      message.error('Ошибка при создании заказа. Попробуйте еще раз.');
    },
  });

    const handleDeadlineChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const now = dayjs();
      if (date.isSame(now, 'day')) {
        // Если сегодня, проверяем время
        if (deadlineTime.hours < now.hour() || 
            (deadlineTime.hours === now.hour() && deadlineTime.minutes <= now.minute())) {
          // Время в прошлом, устанавливаем текущее + 1 час
          setDeadlineTime({
            hours: Math.min(now.hour() + 1, 23),
            minutes: 0
          });
        }
      }
    }
  };

  const handleTimeChange = (field: 'hours' | 'minutes', value: number) => {
    const newTime = { ...deadlineTime, [field]: value };
    setDeadlineTime(newTime);
    
    // Проверяем, не в прошлом ли время (если дата сегодня)
    const deadlineDate = form.getFieldValue('deadline');
    if (deadlineDate && deadlineDate.isSame(dayjs(), 'day')) {
      const now = dayjs();
      if (newTime.hours < now.hour() || 
          (newTime.hours === now.hour() && newTime.minutes <= now.minute())) {
        message.warning('Выбранное время уже прошло');
      }
    }
  };

        const onFinish = async (values: CreateOrderFormValues) => {
      if (submitGuardRef.current) return;
      lockSubmit();
      try {
        setIsUploading(true);
      
        // Логируем данные для отладки
        console.log('📦 Отправляемые данные заказа:', values);
      
        // Объединяем дату и время
        const deadlineWithTime = values.deadline
          .hour(deadlineTime.hours)
          .minute(deadlineTime.minutes)
          .second(0)
          .millisecond(0);
      
                const orderData: CreateOrderRequest = {
                  title: values.title,
                  description: values.description,
                  deadline: deadlineWithTime.toISOString(),
                  subject_id: values.subject,
                  work_type_id: values.work_type,
                  budget: values.budget || null,
                  custom_topic: values.title,
                  client_note: values.client_note || undefined,
                };

      const createdOrder = await createOrderMutation.mutateAsync(orderData);
      
      // Принудительно обновляем кэш заказов для текущего пользователя
      await queryClient.invalidateQueries({ queryKey: ['orders-feed'] });
      await queryClient.refetchQueries({ queryKey: ['orders-feed'] });
      
      const filesToUpload = [...fileList];
      setFileList([]);
      navigate(`/orders/${createdOrder.id}`, { state: { from: '/orders-feed' } });

      if (filesToUpload.length > 0) {
        void (async () => {
          const total = filesToUpload.length;
          message.loading({ content: `Загрузка файлов: 0 из ${total}`, key: 'upload', duration: 0 });

          const concurrency = 3;
          const queue = [...filesToUpload];
          let completed = 0;

          const uploadFile = async (item: UploadFile) => {
            const rawFile = item.originFileObj ?? item;
            if (!(rawFile instanceof File)) {
              message.warning(`Файл ${item.name}: неверный объект, пропуск`);
              return;
            }

            try {
              await ordersApi.uploadOrderFile(createdOrder.id, rawFile, {
                file_type: 'task',
                description: 'Файл задания'
              });
              completed++;
              message.loading({ content: `Загрузка файлов: ${completed} из ${total}`, key: 'upload', duration: 0 });
            } catch (error) {
              console.error('Ошибка загрузки файла:', error);
              const errMsg = (error as any)?.response?.data?.detail || (error as any)?.response?.data?.file?.[0] || (error as Error)?.message;
              message.warning({ content: `${rawFile.name}: ${errMsg || 'ошибка загрузки'}`, key: `uploadErr-${item.uid}` });
            }
          };

          const workers = Array(Math.min(concurrency, total)).fill(null).map(async () => {
            while (queue.length > 0) {
              const file = queue.shift();
              if (file) await uploadFile(file);
            }
          });

          await Promise.all(workers);
          message.success({ content: 'Все файлы загружены', key: 'upload', duration: 2 });
          await queryClient.invalidateQueries({ queryKey: ['order', String(createdOrder.id)] });
        })();
      }
        } catch (error) {
      console.error('❌ Ошибка при создании заказа:', error);
      console.error('📄 Response data:', (error as any)?.response?.data);
      const errMsg =
        (error as any)?.response?.data?.detail ||
        (error as any)?.response?.data?.deadline?.[0] ||
        (error as any)?.response?.data?.budget?.[0] ||
        (error as Error)?.message;
      message.error(errMsg || 'Не удалось создать заказ');
    } finally {
      setIsUploading(false);
      unlockSubmit();
    }
  };

  const getOrderFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdfOutlined className={styles.fileIconPdf} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined className={styles.fileIconDoc} />;
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImageOutlined className={styles.fileIconImage} />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined className={styles.fileIconArchive} />;
    return <FileOutlined className={styles.fileIconDefault} />;
  };

  const formatOrderFileTileName = (filename: string, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    const extIndex = filename.lastIndexOf('.');
    if (extIndex <= 0) return `${filename.slice(0, maxLength - 1)}…`;
    const ext = filename.slice(extIndex);
    const base = filename.slice(0, extIndex);
    const allowedBaseLength = Math.max(6, maxLength - ext.length - 1);
    return `${base.slice(0, allowedBaseLength)}…${ext}`;
  };

  return (
    <div className={styles.container}>
      <AppCard className={styles.card} variant="gradient">
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            Создать заказ
          </Title>
          <AppButton 
            className={styles.buttonSecondary}
            onClick={() => navigate('/orders-feed')}
            variant="secondary"
          >
            К ленте заказов
          </AppButton>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={unlockSubmit}
          initialValues={{
            deadline: dayjs().add(7, 'day'),
          }}
        >
          
          <div className={styles.orderSection}>
            
            <Form.Item
              name="title"
              label="Название работы"
              rules={[{ required: true, message: 'Введите название работы' }]}
            >
              <AppInput 
                placeholder="Введите название работы" 
                className={styles.titleInput}
              />
            </Form.Item>

            
                        <div className={styles.typeSubjectDateRow}>
              <Form.Item
                name="work_type"
                label="Тип работы"
                rules={[{ required: true, message: 'Выберите тип работы' }]}
                className={styles.typeField}
              >
                <AppSelect 
                  placeholder="Тип работы" 
                  className={styles.selectField}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <div className={styles.selectDropdownFooter}>
                        <AppButton
                          variant="text"
                          icon={<PlusOutlined />}
                          onClick={() => setNewWorkTypeModalVisible(true)}
                          className={styles.selectDropdownButton}
                        >
                          Добавить новый тип работы
                        </AppButton>
                      </div>
                    </>
                  )}
                >
                  {sortedWorkTypes.map((type) => (
                    <AppSelect.Option key={type.id} value={type.id}>
                      {type.name}
                    </AppSelect.Option>
                  ))}
                </AppSelect>
              </Form.Item>

              <Form.Item
                name="subject"
                label="Предмет"
                rules={[{ required: true, message: 'Выберите предмет' }]}
                className={styles.subjectField}
              >
                <AppSelect 
                  placeholder="Предмет" 
                  className={styles.selectField}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <div className={styles.selectDropdownFooter}>
                        <AppButton
                          variant="text"
                          icon={<PlusOutlined />}
                          onClick={() => setNewSubjectModalVisible(true)}
                          className={styles.selectDropdownButton}
                        >
                          Добавить новый предмет
                        </AppButton>
                      </div>
                    </>
                  )}
                >
                  {sortedSubjects.map((subject) => (
                    <AppSelect.Option key={subject.id} value={subject.id}>
                      {subject.name}
                    </AppSelect.Option>
                  ))}
                </AppSelect>
              </Form.Item>

              <div className={styles.dateField}>
                <Form.Item
                  name="deadline"
                  label="Дата сдачи"
                  rules={[
                    { required: true, message: 'Выберите дату сдачи' },
                    {
                      validator: (_, value: dayjs.Dayjs | null) => {
                        if (!value) return Promise.resolve();
                        const now = dayjs();
                        const selectedDateTime = value.hour(deadlineTime.hours).minute(deadlineTime.minutes);
                        if (selectedDateTime.isAfter(now)) return Promise.resolve();
                        return Promise.reject(new Error('Выберите дату и время позже текущего'));
                      },
                    },
                  ]}
                  className={styles.dateInputItem}
                >
                  <AppDatePicker
                    placeholder="Дата сдачи"
                    format="DD.MM.YYYY"
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    onChange={handleDeadlineChange}
                    className={styles.dateInput}
                  />
                </Form.Item>

                <div className={styles.timeSelectors}>
                  <div className={styles.timeFieldWrapper}>
                    <label className={styles.timeLabel}>Часы</label>
                    <AppSelect
                      value={deadlineTime.hours}
                      onChange={(value) => handleTimeChange('hours', value)}
                      className={styles.timeSelect}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <AppSelect.Option key={i} value={i}>
                          {String(i).padStart(2, '0')}
                        </AppSelect.Option>
                      ))}
                    </AppSelect>
                  </div>

                  <span className={styles.timeSeparator}>:</span>

                  <div className={styles.timeFieldWrapper}>
                    <label className={styles.timeLabel}>Минуты</label>
                    <AppSelect
                      value={deadlineTime.minutes}
                      onChange={(value) => handleTimeChange('minutes', value)}
                      className={styles.timeSelect}
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <AppSelect.Option key={i} value={i}>
                          {String(i).padStart(2, '0')}
                        </AppSelect.Option>
                      ))}
                    </AppSelect>
                  </div>
                </div>
              </div>
            </div>

            
            <Form.Item
              name="description"
              label="Описание работы"
              rules={[{ required: true, message: 'Введите описание работы' }]}
            >
              <AppInput.TextArea
                placeholder="Введите описание работы"
                rows={6}
                className={styles.descriptionTextarea}
              />
            </Form.Item>


            
                        <Form.Item
              name="budget"
              label="Стоимость (₽)"
              rules={[
                { 
                  validator: (_, value) => {
                    if (value !== undefined && value !== null && Number(value) <= 0) {
                      return Promise.reject(new Error('Стоимость должна быть больше 0'));
                    }
                    if (value !== undefined && value !== null && Number(value) > MAX_ORDER_BUDGET) {
                      return Promise.reject(new Error(`Стоимость не может превышать ${MAX_ORDER_BUDGET.toLocaleString('ru-RU')} ₽`));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <AppInput.Number
                placeholder="Стоимость (необязательно)"
                min={1}
                max={MAX_ORDER_BUDGET}
                className={`${styles.priceInput} ${styles.fullWidth}`}
              />
            </Form.Item>

            
                        <Form.Item
              name="files"
              label="Прикрепить файлы (необязательно)"
            >
              <AppUpload.Dragger
                name="files"
                multiple
                fileList={fileList}
                showUploadList={false}
                beforeUpload={(file) => {
                  const isLt50M = file.size < 50 * 1024 * 1024;
                  if (!isLt50M) {
                    message.error('Максимальный размер файла: 50 МБ');
                    return AppUpload.LIST_IGNORE;
                  }
                  
                  const ext = file.name.split('.').pop()?.toLowerCase() || '';
                  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
                    message.error('Неподдерживаемый формат файла');
                    return AppUpload.LIST_IGNORE;
                  }
                  
                  setFileList(prev => [...prev, file as UploadFile]);
                  return false;
                }}
                onRemove={(file) => {
                  setFileList(prev => prev.filter(f => f.uid !== file.uid));
                }}
                className={styles.uploadArea}
              >
                <div className="ant-upload-drag-icon">
                  <InboxOutlined />
                </div>
                <div className="ant-upload-text">Нажмите или перетащите файлы сюда</div>
                <div className="ant-upload-hint">
                  Допустимые форматы: .doc, .docx, .pdf, .rtf, .txt, .ppt, .pptx, .xls, .xlsx, .csv, .dwg, .dxf, .cdr, .cdw, .bak, .jpg, .png, .bmp, .svg, .zip, .rar, .7z
                </div>
                            </AppUpload.Dragger>
              {fileList.length > 0 && (
                <div className={styles.orderFilesGrid}>
                  {fileList.map((file) => (
                    <button
                      key={file.uid}
                      type="button"
                      className={styles.orderFileTile}
                      onClick={() => {
                        setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                      }}
                      title={`Убрать ${file.name}`}
                    >
                      <div className={styles.orderFileIconBox}>
                        {getOrderFileIcon(file.name)}
                      </div>
                      <div className={styles.orderFileName}>
                        {formatOrderFileTileName(file.name)}
                      </div>
                      <DeleteOutlined className={styles.orderFileDeleteIcon} />
                    </button>
                  ))}
                </div>
              )}
            </Form.Item>

            
            <Form.Item
              name="client_note"
              label="Поле, видимое только для вас"
              tooltip="Эта заметка будет видна только вам при просмотре заказа"
            >
              <AppInput.TextArea
                placeholder="Добавьте заметку к заказу (видна только вам)"
                rows={3}
                className={styles.descriptionTextarea}
              />
            </Form.Item>
          </div>

          
          <Form.Item className={styles.submitSection}>
            <AppButton 
              type="primary" 
              htmlType="submit" 
              className={styles.submitButton}
              size="large"
              loading={submitLocked || createOrderMutation.isPending || isUploading}
              disabled={submitLocked || createOrderMutation.isPending || isUploading}
            >
              {submitLocked || createOrderMutation.isPending || isUploading ? 'Создание заказа...' : 'Создать заказ'}
            </AppButton>
          </Form.Item>
        </Form>
      </AppCard>

      
            <Modal
        title="Добавить новый тип работы"
        open={newWorkTypeModalVisible}
        onOk={() => {
          if (newWorkTypeName.trim()) {
            // Приводим к правильному регистру: первая буква заглавная, остальные строчные
            const normalizedName = newWorkTypeName.trim().split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            createWorkTypeMutation.mutate(normalizedName);
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
        <AppInput
          placeholder="Название типа работы"
          value={newWorkTypeName}
          onChange={(e) => setNewWorkTypeName(e.target.value)}
          onPressEnter={() => {
            if (newWorkTypeName.trim()) {
              const normalizedName = newWorkTypeName.trim().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              createWorkTypeMutation.mutate(normalizedName);
            }
          }}
        />
      </Modal>

      
            <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          if (newSubjectName.trim()) {
            // Приводим к правильному регистру: первая буква заглавная, остальные строчные
            const normalizedName = newSubjectName.trim().split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            createSubjectMutation.mutate(normalizedName);
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
        <AppInput
          placeholder="Название предмета"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onPressEnter={() => {
            if (newSubjectName.trim()) {
              const normalizedName = newSubjectName.trim().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              createSubjectMutation.mutate(normalizedName);
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default CreateOrder;
