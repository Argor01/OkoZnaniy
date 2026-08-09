import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Typography, Form, Switch, message } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { catalogApi } from '@/features/common/api/catalog';
import { ordersApi } from '@/features/orders/api/orders';
import { AppButton, AppInput, AppSelect, AppDatePicker, AddNewItemModal } from '@/components/ui';
import { useDeviceType } from '@/hooks/useDeviceType';
import styles from './IndividualOfferModal.module.css';
import modalStyles from '../../../expert/modals/MessageModalNew.module.css';
import { useSortedSubjects, useSortedWorkTypes } from '@/hooks';

const { Text, Title } = Typography;

interface IndividualOfferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OfferSubmitData) => void;
  loading?: boolean;
  variant?: 'individual' | 'work_offer';
  workTitle?: string;
  clientId?: number;
}

type OfferSubmitData = {
  description: string;
  work_type_id?: number;
  work_type?: string;
  subject_id?: number;
  subject?: string;
  cost: number;
  prepayment_percent?: number;
  deadline: string | null;
} & Record<string, unknown>;

type OfferFormValues = {
  description: string;
  work_type_id?: number;
  subject_id?: number;
  cost: number;
  prepayment_percent?: number;
  deadline: { toISOString: () => string } | null;
} & Record<string, unknown>;

const IndividualOfferModal: React.FC<IndividualOfferModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  variant = 'individual',
  workTitle,
  clientId,
}) => {
  const [form] = Form.useForm();
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const queryClient = useQueryClient();
  const [newSubjectModalVisible, setNewSubjectModalVisible] = useState(false);
  const [newWorkTypeModalVisible, setNewWorkTypeModalVisible] = useState(false);
  const [linkToOrder, setLinkToOrder] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const isIndividual = variant === 'individual';

  const { data: availableOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['clientAvailableOrders', clientId],
    queryFn: () => ordersApi.getClientAvailableOrders(clientId!),
    enabled: open && linkToOrder && !!clientId,
  });

  const selectedOrder = availableOrders.find((o) => o.id === selectedOrderId);

  useEffect(() => {
    if (!open) {
      setLinkToOrder(false);
      setSelectedOrderId(null);
      form.resetFields();
    }
  }, [open, form]);

  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.subject?.id) form.setFieldValue('subject_id', selectedOrder.subject.id);
      if (selectedOrder.work_type?.id) form.setFieldValue('work_type_id', selectedOrder.work_type.id);
    }
  }, [selectedOrder, form]);

  const {data: subjects = [], isLoading: subjectsLoading} = useSortedSubjects();

  const {data: workTypes = [], isLoading: workTypesLoading} = useSortedWorkTypes();

  const createSubjectMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createSubject(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewSubjectModalVisible(false);
      message.success('Новый предмет добавлен');
      if (data?.id) form.setFieldValue('subject_id', data.id);
    },
    onError: () => {
      message.error('Не удалось добавить предмет');
    },
  });

  const createWorkTypeMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createWorkType(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-types'] });
      setNewWorkTypeModalVisible(false);
      message.success('Новый тип работы добавлен');
      if (data?.id) form.setFieldValue('work_type_id', data.id);
    },
    onError: () => {
      message.error('Не удалось добавить тип работы');
    },
  });

  const handleFinish = (values: OfferFormValues) => {
    const selectedWorkType = isIndividual
      ? workTypes.find((w) => w.id === values.work_type_id)
      : undefined;
    const selectedSubject = isIndividual
      ? subjects.find((s) => s.id === values.subject_id)
      : undefined;

    const data: OfferSubmitData = {
      ...values,
      work_type_id: isIndividual ? values.work_type_id : undefined,
      work_type: isIndividual ? selectedWorkType?.name : undefined,
      subject_id: isIndividual ? values.subject_id : undefined,
      subject: isIndividual ? selectedSubject?.name : undefined,
      deadline: isIndividual && values.deadline ? values.deadline.toISOString() : null,
      linked_order_id: linkToOrder && selectedOrderId ? selectedOrderId : undefined,
    };
    onSubmit(data);
  };

  const getSelectClassName = () => {
    if (isMobile) {
      return modalStyles.specializationSelectorMobile;
    }
    if (isTablet) {
      return modalStyles.specializationSelectorTablet;
    }
    return '';
  };

  const getSelectPopupClassName = () => {
    if (isMobile) {
      return modalStyles.specializationDropdownMobile;
    }
    if (isTablet) {
      return modalStyles.specializationDropdownTablet;
    }
    return '';
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : isTablet ? 500 : 600}
      style={isMobile ? { top: 0, paddingBottom: 0 } : {}}
      title={
        <div className={styles.titleWrapper}>
          <Title level={4} className={styles.title}>
            {isIndividual ? 'Индивидуальное предложение' : 'Предложение готовой работы'}
          </Title>
        </div>
      }
      closeIcon={<CloseOutlined />}
    >
      <div className={styles.body}>
        <Text type="secondary" className={styles.text}>
          {isIndividual
            ? 'Вы можете отправить покупателю индивидуальное предложение своих услуг.'
            : 'Заполните информацию, после чего в чат отправится карточка предложения.'}
        </Text>
        {isIndividual ? (
          <>
            <Text type="secondary" className={styles.textCompact}>
              1. Укажите, какие услуги и в каком объеме будут предоставлены покупателю.
            </Text>
            <Text type="secondary" className={styles.text}>
              2. Опишите свой релевантный опыт. Продемонстрируйте 1-3 примера выполнения похожей работы.
            </Text>
          </>
        ) : workTitle ? (
          <Text type="secondary" className={styles.text}>
            {workTitle}
          </Text>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ prepayment_percent: 50 }}
          requiredMark={false}
        >
          <Form.Item
            name="description"
            label={<Text strong>Описание</Text>}
            rules={[{ required: true, message: 'Пожалуйста, введите описание' }]}
          >
            <AppInput.TextArea 
              rows={6} 
              placeholder={isIndividual ? 'Напишите, как вы будете решать задачу клиента' : 'Опишите, что входит в работу'} 
              maxLength={2000}
              showCount
            />
          </Form.Item>

          {isIndividual && clientId ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: linkToOrder ? 12 : 0 }}>
                <Switch
                  size="small"
                  checked={linkToOrder}
                  onChange={(checked) => {
                    setLinkToOrder(checked);
                    if (!checked) setSelectedOrderId(null);
                  }}
                />
                <Text strong>Привязать к существующему заказу</Text>
              </div>
              {linkToOrder && (
                <Form.Item
                  name="linked_order_id"
                  rules={[{ required: linkToOrder, message: 'Выберите заказ' }]}
                >
                  <AppSelect
                    className={getSelectClassName()}
                    popupClassName={getSelectPopupClassName()}
                    placeholder="Выберите заказ"
                    loading={ordersLoading}
                    showSearch
                    optionFilterProp="label"
                    size={isMobile ? 'large' : 'middle'}
                    options={availableOrders.map((o) => ({
                      value: o.id,
                      label: `#${o.id} — ${o.title || o.subject?.name || 'Заказ'}${o.price_type === 'fixed' && o.budget ? ` (${o.budget}₽)` : ''}`,
                    }))}
                    onChange={(value: number) => setSelectedOrderId(value)}
                  />
                </Form.Item>
              )}
            </div>
          ) : null}

          {isIndividual ? (
            <>
              {!linkToOrder && (
                <Form.Item
                  name="work_type_id"
                  label={<Text strong>Тип работы</Text>}
                  rules={[{ required: true, message: 'Укажите тип работы' }]}
                >
                <AppSelect
                  className={getSelectClassName()}
                  popupClassName={getSelectPopupClassName()}
                  placeholder="Выберите тип работы"
                  loading={workTypesLoading}
                  showSearch
                  optionFilterProp="label"
                  size={isMobile ? 'large' : 'middle'}
                  options={workTypes
                    .filter((w) => w.is_active !== false)
                    .map((w) => ({ value: w.id, label: w.name }))}
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
                />
              </Form.Item>
              )}

              {!linkToOrder && (
                <Form.Item
                  name="subject_id"
                  label={<Text strong>Предмет</Text>}
                  rules={[{ required: true, message: 'Укажите предмет' }]}
                >
                  <AppSelect
                    className={getSelectClassName()}
                    popupClassName={getSelectPopupClassName()}
                    placeholder="Выберите предмет"
                    loading={subjectsLoading}
                    showSearch
                    optionFilterProp="label"
                    size={isMobile ? 'large' : 'middle'}
                    options={subjects
                      .filter((s) => s.is_active !== false)
                      .map((s) => ({ value: s.id, label: s.name }))}
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
                  />
                </Form.Item>
              )}
            </>
          ) : null}

          <Form.Item
            name="cost"
            label={<Text strong>Стоимость</Text>}
            rules={[{ required: true, message: 'Укажите стоимость' }]}
          >
            <AppInput.Number
              className={styles.fullWidth}
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => Number((value ?? '').replace(/₽\s?|(,*)/g, ''))}
              min={500}
              max={2000000}
              placeholder="₽ 500 - 2 000 000"
            />
          </Form.Item>

          {isIndividual ? (
            <Form.Item
              name="prepayment_percent"
              label={<Text strong>Процент предоплаты</Text>}
              rules={[
                { required: true, message: 'Укажите процент предоплаты' },
                {
                  validator: (_, value) => {
                    const num = Number(value);
                    if (!Number.isFinite(num) || num < 0 || num > 100) {
                      return Promise.reject(new Error('Процент должен быть от 0 до 100'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <AppInput.Number
                className={styles.fullWidth}
                min={0}
                max={100}
                placeholder="0-100"
              />
            </Form.Item>
          ) : null}

          {isIndividual ? (
            <Form.Item
              name="deadline"
              label={<Text strong>Срок выполнения</Text>}
              rules={[
                { required: true, message: 'Укажите срок выполнения' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const selected = dayjs(value);
                    if (!selected.isValid()) {
                      return Promise.reject(new Error('Укажите корректные дату и время'));
                    }
                    if (selected.valueOf() <= dayjs().valueOf()) {
                      return Promise.reject(new Error('Срок должен быть позже текущего времени'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <AppDatePicker 
                className={styles.fullWidth}
                placeholder="Выберите дату и время"
                showTime
                format="DD.MM.YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          ) : (
            null
          )}

          <Form.Item className={styles.submitItem}>
            <AppButton
              variant="success"
              htmlType="submit"
              loading={loading}
              className={styles.submitButton}
            >
              Отправить предложение
            </AppButton>
          </Form.Item>
        </Form>
      </div>

      <AddNewItemModal
        title="Добавить новый предмет"
        placeholder="Название предмета"
        emptyMessage="Введите название предмета"
        open={newSubjectModalVisible}
        onOk={(name) => createSubjectMutation.mutate(name)}
        onCancel={() => setNewSubjectModalVisible(false)}
        confirmLoading={createSubjectMutation.isPending}
      />

      <AddNewItemModal
        title="Добавить новый тип работы"
        placeholder="Название типа работы"
        emptyMessage="Введите название типа работы"
        open={newWorkTypeModalVisible}
        onOk={(name) => createWorkTypeMutation.mutate(name)}
        onCancel={() => setNewWorkTypeModalVisible(false)}
        confirmLoading={createWorkTypeMutation.isPending}
      />
    </Modal>
  );
};

export default IndividualOfferModal;
