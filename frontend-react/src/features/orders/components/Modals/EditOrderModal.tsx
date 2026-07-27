import React, { useRef, useState, useEffect } from 'react';
import { Form, Typography, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { catalogApi } from '@/features/common/api/catalog';
import { ordersApi, Order } from '@/features/orders/api/orders';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppDatePicker } from '@/components/ui/AppDatePicker';
import { AppButton } from '@/components/ui/AppButton';
import { useDeviceType } from '@/hooks/useDeviceType';

import styles from './EditOrderModal.module.css';
import { logger } from '@/utils/logger';
import { useSubjects, useWorkTypes } from '@/hooks/queries';

interface EditOrderFormValues {
  title: string;
  description: string;
  deadline: dayjs.Dayjs;
  subject: number;
  work_type: number;
  budget?: number | null;
  client_note?: string;
}

interface DeadlineTimeValues {
  hours: number;
  minutes: number;
}

interface EditOrderModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess?: () => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  visible,
  onClose,
  order,
  onSuccess,
}) => {
  const [form] = Form.useForm<EditOrderFormValues>();
  const queryClient = useQueryClient();
  const { isMobile, isTablet, isDesktop } = useDeviceType();
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

  // Проверка: можно ли редактировать заказ (только если нет эксперта или статус 'new')
  const canEdit = order && (!order.expert || order.status === 'new');

  // Загрузка данных предмета и типа работы
  const {data: subjects = []} = useSubjects();

  const {data: workTypes = []} = useWorkTypes();

  const sortedSubjects = [...subjects].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
  );

  const sortedWorkTypes = [...workTypes].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'ru', { sensitivity: 'base' })
  );

  // Инициализация формы данными заказа
  useEffect(() => {
    if (visible && order) {
      // Устанавливаем значения формы
      const deadlineDate = order.deadline ? dayjs(order.deadline) : dayjs().add(7, 'day');
      setDeadlineTime({
        hours: deadlineDate.hour(),
        minutes: deadlineDate.minute(),
      });

      form.setFieldsValue({
        title: order.title,
        description: order.description,
        deadline: deadlineDate.startOf('day'),
        subject: typeof order.subject === 'object' ? order.subject?.id : order.subject,
        work_type: typeof order.work_type === 'object' ? order.work_type?.id : order.work_type,
        budget: order.budget ? Number(order.budget) : undefined,
        client_note: order.client_note || '',
      });
    }
  }, [visible, order, form]);

  // Создание нового типа работы
  const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workTypes'] });
      setNewWorkTypeModalVisible(false);
      setNewWorkTypeName('');
      message.success('Новый тип работы добавлен');
      if (data?.id) {
        form.setFieldValue('work_type', data.id);
      }
    },
    onError: () => {
      message.error('Ошибка при добавлении типа работы');
    },
  });

  // Создание нового предмета
  const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      setNewSubjectName('');
      message.success('Новый предмет добавлен');
      if (data?.id) {
        form.setFieldValue('subject', data.id);
      }
    },
    onError: () => {
      message.error('Ошибка при добавлении предмета');
    },
  });

  // Обновление заказа
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: Partial<Order> }) =>
      ordersApi.updateOrder(orderId, data as any),
    onSuccess: () => {
      message.success('Заказ успешно обновлен!');
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      logger.error('Ошибка обновления заказа:', error);
      message.error('Ошибка при обновлении заказа. Попробуйте еще раз.');
    },
  });

  const handleDeadlineChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const now = dayjs();
      if (date.isSame(now, 'day')) {
        if (deadlineTime.hours < now.hour() ||
            (deadlineTime.hours === now.hour() && deadlineTime.minutes <= now.minute())) {
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

    const deadlineDate = form.getFieldValue('deadline');
    if (deadlineDate && deadlineDate.isSame(dayjs(), 'day')) {
      const now = dayjs();
      if (newTime.hours < now.hour() ||
          (newTime.hours === now.hour() && newTime.minutes <= now.minute())) {
        message.warning('Выбранное время уже прошло');
      }
    }
  };

  const onFinish = async (values: EditOrderFormValues) => {
    if (!order || !canEdit || submitGuardRef.current) return;
    lockSubmit();

    try {
      const deadlineWithTime = values.deadline
        .hour(deadlineTime.hours)
        .minute(deadlineTime.minutes)
        .second(0)
        .millisecond(0);

      const orderData: any = {
        title: values.title,
        description: values.description,
        deadline: deadlineWithTime.toISOString(),
        subject_id: values.subject,
        work_type_id: values.work_type,
        budget: values.budget ? String(values.budget) : undefined,
        client_note: values.client_note || undefined,
      };

      await updateOrderMutation.mutateAsync({ orderId: order.id, data: orderData });

      await queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] });
    } catch (error) {
      logger.error('❌ Ошибка при обновлении заказа:', error);
      const errMsg =
        (error as any)?.response?.data?.detail ||
        (error as any)?.response?.data?.deadline?.[0] ||
        (error as any)?.response?.data?.budget?.[0] ||
        (error as Error)?.message;
      message.error(errMsg || 'Не удалось обновить заказ');
    } finally {
      unlockSubmit();
    }
  };

  if (!order) return null;

  return (
    <>
      <Modal
        title={
          <div className={styles.modalTitle}>
            Редактировать заказ №{order.id}
          </div>
        }
        open={visible}
        onCancel={onClose}
        onOk={() => form.submit()}
        width={isMobile ? '100%' : isTablet ? 700 : 900}
        style={isMobile ? { top: 0, paddingBottom: 0 } : { top: 20 }}
        bodyStyle={isMobile ? { height: '100vh', overflow: 'auto', padding: '16px' } : {}}
        okText="Сохранить изменения"
        cancelText="Отмена"
        okButtonProps={{
          loading: submitLocked || updateOrderMutation.isPending,
          disabled: !canEdit || submitLocked || updateOrderMutation.isPending,
          size: isMobile ? 'large' : 'large',
        }}
        cancelButtonProps={{
          onClick: onClose,
          size: isMobile ? 'large' : 'large',
        }}
        wrapClassName={`${styles.editOrderModalWrap} ${isMobile ? styles.editOrderModalMobile : isTablet ? styles.editOrderModalTablet : styles.editOrderModalDesktop}`}
      >
        {!canEdit && (
          <div className={styles.editDisabledWarning}>
            <Typography.Text type="warning" strong>
              Редактирование недоступно: заказ уже взят в работу экспертом
            </Typography.Text>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={unlockSubmit}
          disabled={!canEdit}
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
                  getPopupContainer={() => document.body}
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
                  getPopupContainer={() => document.body}
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
                      getPopupContainer={() => document.body}
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
                      getPopupContainer={() => document.body}
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
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <AppInput.Number
                placeholder="Стоимость (необязательно)"
                min={1}
                className={`${styles.priceInput} ${styles.fullWidth}`}
              />
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
        </Form>
      </Modal>

      {/* Модалка для нового типа работы */}
      <Modal
        title="Добавить новый тип работы"
        open={newWorkTypeModalVisible}
        onOk={() => {
          if (newWorkTypeName.trim()) {
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

      {/* Модалка для нового предмета */}
      <Modal
        title="Добавить новый предмет"
        open={newSubjectModalVisible}
        onOk={() => {
          if (newSubjectName.trim()) {
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
    </>
  );
};

export default EditOrderModal;
