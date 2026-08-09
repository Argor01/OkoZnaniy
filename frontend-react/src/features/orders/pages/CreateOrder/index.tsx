import React, { useRef, useState } from 'react';
import { Form, Typography, message, Modal, Radio } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined, PlusOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { catalogApi } from '@/features/common/api/catalog';
import { ordersApi } from '@/features/orders/api/orders';
import { CreateOrderRequest } from '@/features/orders/types/orders';
import { walletApi } from '@/features/wallet/api/wallet';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppUpload } from '@/components/ui/AppUpload';
import { DeadlinePicker } from '@/components/ui/DeadlinePicker';
import { AddNewItemModal } from '@/components/ui/AddNewItemModal';
import { ALLOWED_FILE_EXTENSIONS } from '@/constants/files';
import { useSortedSubjects, useSortedWorkTypes } from '@/hooks';

import styles from './CreateOrder.module.css';
import { logger } from '@/utils/logger';

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
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable'>('fixed');
  const submitGuardRef = useRef(false);

  const { data: walletBalance } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: walletApi.me,
    staleTime: 30_000,
  });
  const availableBalance = walletBalance ? Number(walletBalance.available_balance) : 0;

  const lockSubmit = () => {
    submitGuardRef.current = true;
    setSubmitLocked(true);
  };

  const unlockSubmit = () => {
    submitGuardRef.current = false;
    setSubmitLocked(false);
  };

  
  const {data: subjects = []} = useSortedSubjects();

  const {data: workTypes = []} = useSortedWorkTypes();

  
    const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
      message.success('Новый тип работы добавлен');
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
      message.success('Новый предмет добавлен');
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
      logger.error('Ошибка создания заказа:', error);
      message.error('Ошибка при создании заказа. Попробуйте еще раз.');
    },
  });

  
        const onFinish = async (values: CreateOrderFormValues) => {
      if (submitGuardRef.current) return;
      lockSubmit();
      try {
        setIsUploading(true);
      
        // Логируем данные для отладки
        logger.log('📦 Отправляемые данные заказа:', values);
      
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
                  budget: priceType === 'fixed' ? (values.budget || null) : null,
                  price_type: priceType,
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
              logger.error('Ошибка загрузки файла:', error);
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
      logger.error('❌ Ошибка при создании заказа:', error);
      logger.error('📄 Response data:', (error as any)?.response?.data);
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
                  {workTypes.map((type) => (
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
                  {subjects.map((subject) => (
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
                  <DeadlinePicker
                    timeValue={deadlineTime}
                    onTimeChange={setDeadlineTime}
                    className={styles.dateInput}
                    timeClassName={styles.timeSelectors}
                  />
                </Form.Item>
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

            <Form.Item label="Тип цены" className={styles.priceTypeItem}>
              <Radio.Group value={priceType} onChange={(e) => setPriceType(e.target.value)}>
                <Radio value="fixed">Фиксированная цена</Radio>
                <Radio value="negotiable">Договорная цена</Radio>
              </Radio.Group>
            </Form.Item>

            {priceType === 'fixed' ? (
              <div className={styles.priceSection}>
                <Typography.Text type="secondary">
                  Доступно на балансе: {availableBalance.toLocaleString('ru-RU')} ₽
                </Typography.Text>
              </div>
            ) : (
              <div className={styles.priceSection}>
                <Typography.Text type="secondary">
                  Вы публикуете заказ с договорной ценой — эксперты предложат свою стоимость в откликах.
                </Typography.Text>
              </div>
            )}

            {priceType === 'fixed' && (
              <Form.Item
                name="budget"
                label="Стоимость (₽)"
                rules={[
                  { required: true, message: 'Укажите стоимость заказа' },
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
                  placeholder="Стоимость"
                  min={1}
                  max={MAX_ORDER_BUDGET}
                  className={`${styles.priceInput} ${styles.fullWidth}`}
                />
              </Form.Item>
            )}

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
                        {file.name}
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

      
            <AddNewItemModal
        title="Добавить новый тип работы"
        placeholder="Название типа работы"
        emptyMessage="Введите название типа работы"
        open={newWorkTypeModalVisible}
        onOk={(name) => createWorkTypeMutation.mutate(name)}
        onCancel={() => setNewWorkTypeModalVisible(false)}
        confirmLoading={createWorkTypeMutation.isPending}
      />

      
            <AddNewItemModal
        title="Добавить новый предмет"
        placeholder="Название предмета"
        emptyMessage="Введите название предмета"
        open={newSubjectModalVisible}
        onOk={(name) => createSubjectMutation.mutate(name)}
        onCancel={() => setNewSubjectModalVisible(false)}
        confirmLoading={createSubjectMutation.isPending}
      />
    </div>
  );
};

export default CreateOrder;
