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
}

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
  const [form] = Form.useForm<CreateOrderFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const [newWorkTypeModalVisible, setNewWorkTypeModalVisible] = useState(false);
  const [newSubjectModalVisible, setNewSubjectModalVisible] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
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

  
  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.createOrder(data),
    onSuccess: () => {
      message.success('Заказ успешно создан!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      console.error('Ошибка создания заказа:', error);
      message.error('Ошибка при создании заказа. Попробуйте еще раз.');
    },
  });

  const getDisabledTime = (current: dayjs.Dayjs | null) => {
    if (!current) return {};
    const now = dayjs();
    if (!current.isSame(now, 'day')) return {};

    const currentHour = now.hour();
    const currentMinute = now.minute();
    return {
      disabledHours: () => Array.from({ length: currentHour }, (_, i) => i),
      disabledMinutes: (selectedHour: number) =>
        selectedHour === currentHour ? Array.from({ length: currentMinute + 1 }, (_, i) => i) : [],
    };
  };

  const onFinish = async (values: CreateOrderFormValues) => {
    if (submitGuardRef.current) return;
    lockSubmit();
    try {
      setIsUploading(true);
      const orderData: CreateOrderRequest = {
        title: values.title,
        description: values.description,
        deadline: values.deadline.second(0).millisecond(0).toISOString(),
        subject_id: values.subject,
        work_type_id: values.work_type,
        budget: values.budget,
        custom_topic: values.title,
      };

      const createdOrder = await createOrderMutation.mutateAsync(orderData);
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
      console.error('Ошибка при создании заказа:', error);
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

              <Form.Item
                name="deadline"
                label="Дата сдачи"
                rules={[
                  { required: true, message: 'Выберите дату и время сдачи' },
                  {
                    validator: (_, value: dayjs.Dayjs | null) => {
                      if (!value) return Promise.resolve();
                      if (value.isAfter(dayjs())) return Promise.resolve();
                      return Promise.reject(new Error('Выберите время позже текущего'));
                    },
                  },
                ]}
                className={styles.dateField}
              >
                <AppDatePicker
                  placeholder="Дата и время сдачи"
                  format="DD.MM.YYYY HH:mm"
                  showTime={{ format: 'HH:mm' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  disabledTime={getDisabledTime}
                  className={styles.dateInput}
                />
              </Form.Item>
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
              <AppInput.Number
                placeholder="Стоимость"
                min={1}
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
                  const isLt10M = file.size < 10 * 1024 * 1024;
                  if (!isLt10M) {
                    message.error('Максимальный размер файла: 10 МБ');
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
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Нажмите или перетащите файлы сюда</p>
                <p className="ant-upload-hint">
                  Допустимые форматы: .doc, .docx, .pdf, .rtf, .txt, .ppt, .pptx, .xls, .xlsx, .csv, .dwg, .dxf, .cdr, .cdw, .bak, .jpg, .png, .bmp, .svg
                </p>
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
        <AppInput
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
        <AppInput
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
