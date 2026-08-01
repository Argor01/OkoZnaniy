import React, { useRef, useState, useEffect } from 'react';
import { Form, Typography, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { catalogApi } from '@/features/common/api/catalog';
import { ordersApi, Order } from '@/features/orders/api/orders';
import { AppInput } from '@/components/ui/AppInput';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppButton } from '@/components/ui/AppButton';
import { DeadlinePicker } from '@/components/ui/DeadlinePicker';
import { AddNewItemModal } from '@/components/ui/AddNewItemModal';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useSortedSubjects, useSortedWorkTypes } from '@/hooks';

import styles from './EditOrderModal.module.css';
import { logger } from '@/utils/logger';

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
  const [deadlineTime, setDeadlineTime] = useState<{ hours: number; minutes: number }>({ hours: 12, minutes: 0 });
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
  const {data: subjects = []} = useSortedSubjects();

  const {data: workTypes = []} = useSortedWorkTypes();

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
      <AddNewItemModal
        title="Добавить новый тип работы"
        placeholder="Название типа работы"
        emptyMessage="Введите название типа работы"
        open={newWorkTypeModalVisible}
        onOk={(name) => createWorkTypeMutation.mutate(name)}
        onCancel={() => setNewWorkTypeModalVisible(false)}
        confirmLoading={createWorkTypeMutation.isPending}
      />

      {/* Модалка для нового предмета */}
      <AddNewItemModal
        title="Добавить новый предмет"
        placeholder="Название предмета"
        emptyMessage="Введите название предмета"
        open={newSubjectModalVisible}
        onOk={(name) => createSubjectMutation.mutate(name)}
        onCancel={() => setNewSubjectModalVisible(false)}
        confirmLoading={createSubjectMutation.isPending}
      />
    </>
  );
};

export default EditOrderModal;
