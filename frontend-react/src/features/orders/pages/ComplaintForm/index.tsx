import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, Form, Input, InputNumber, Select, DatePicker, Upload, message, Space, Card, Divider, Avatar, Modal } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, FileOutlined, LinkOutlined, CheckCircleOutlined, RightOutlined } from '@ant-design/icons';
import { complaintsApi, CreateComplaintRequest, Complaint } from '@/features/arbitration/api/complaints';
import { ordersApi, Order } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import { supportRequestsApi } from '@/features/support/api/requests';
import { AppButton, AppCard } from '@/components/ui';
import { UserOutlined, DollarOutlined, NumberOutlined, BookOutlined, ReadOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/utils/formatters';
import styles from './ComplaintForm.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const COMPLAINT_TYPES = [
  { value: 'not_completed', label: 'Заказ не выполнен' },
  { value: 'poor_quality', label: 'Заказ выполнен некачественно/частично' },
  { value: 'not_paid', label: 'Заказ не оплачен' },
  { value: 'unjustified_review', label: 'Необоснованный отзыв' },
  { value: 'ready_works_shop', label: 'Магазин готовых работ' },
  { value: 'other', label: 'Другое' },
];

const FINANCIAL_REQUIREMENTS = [
  { value: 'prepayment_refund', label: 'Возврат предоплаты' },
  { value: 'prepayment_refund_plus_penalty', label: 'Возврат предоплаты и неустойка' },
  { value: 'no_refund', label: 'Возврат не требуется' },
];

interface ComplaintFormData {
  complaint_type: string;
  is_order_relevant: boolean;
  relevant_until?: string;
  financial_requirement: string;
  refund_percent?: number;
  description: string;
  order_link: string;
}

const ComplaintForm: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<ComplaintFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [fileList, setFileList] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: order, isLoading: orderLoading } = useQuery<Order, Error>({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(Number(orderId)),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order) {
      form.setFieldsValue({
        order_link: `${window.location.origin}/orders/${order.id}`,
      });
    }
  }, [order, form]);

  const handleSubmit = async (values: ComplaintFormData) => {
    if (!orderId) {
      message.error('Не указан заказ');
      return;
    }

    setIsSubmitting(true);

    try {
      const reasonMap: Record<string, string> = {
        not_completed: 'order_not_completed',
        poor_quality: 'poor_quality',
        not_paid: 'payment_dispute',
        unjustified_review: 'other',
        ready_works_shop: 'other',
        other: 'other',
      };
      const refundType =
        values.financial_requirement === 'no_refund'
          ? 'none'
          : values.refund_percent && values.refund_percent > 0 && values.refund_percent < 100
            ? 'partial'
            : 'full';

      await supportRequestsApi.createClaim({
        order_id: Number(orderId),
        claim_type: values.complaint_type,
        subject: COMPLAINT_TYPES.find((item) => item.value === values.complaint_type)?.label || values.complaint_type,
        description: values.description,
        reason: reasonMap[values.complaint_type] || 'other',
        refund_type: refundType,
        refund_percentage: refundType === 'partial' ? values.refund_percent : undefined,
      });

      message.success('Претензия подана. Открываю центр обращений.');
      navigate('/support');
      return;
      // Подготовка данных для отправки
      const createData: CreateComplaintRequest = {
        order_id: Number(orderId),
        complaint_type: values.complaint_type,
        is_order_relevant: values.is_order_relevant,
        relevant_until: values.relevant_until ? new Date(values.relevant_until).toISOString() : undefined,
        financial_requirement: values.financial_requirement,
        refund_percent: values.refund_percent,
        description: values.description,
        files: fileList.map(f => f.originFileObj || f).filter(Boolean),
      };

      // Создаём претензию через API
      const complaint = await complaintsApi.create(createData);
      
      // Сохраняем данные претензии и показываем модальное окно
      setCreatedComplaint(complaint);
      setShowSuccessModal(true);
    } catch (e: any) {
      const data = e?.response?.data;
      let errorMsg = 'Не удалось подать претензию';
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = String(data.detail);
        } else if (typeof data === 'object') {
          const fieldErrors = Object.entries(data)
            .filter(([key]) => key !== 'existing_case_number')
            .map(([key, value]) => {
              if (Array.isArray(value)) return `${key}: ${value.join('; ')}`;
              if (typeof value === 'string') return `${key}: ${value}`;
              return null;
            })
            .filter(Boolean);
          if (fieldErrors.length > 0) {
            errorMsg = fieldErrors.join('\n');
          }
        }
      }

      // Если уже есть открытая претензия, перенаправляем в арбитраж
      if (errorMsg.includes('уже есть') || errorMsg.includes('активная претензия') || errorMsg.includes('already')) {
        message.warning('У вас уже есть открытая претензия по этому заказу');
        setTimeout(() => {
          navigate('/support');
        }, 1000);
      } else {
        message.error(errorMsg);
        console.error('[ComplaintForm] submit failed:', data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOrderRelevant = Form.useWatch('is_order_relevant', form);
  const financialRequirement = Form.useWatch('financial_requirement', form);

  if (orderLoading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner}>Загрузка...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Заказ не найден</Title>
        <AppButton variant="primary" onClick={() => navigate('/orders-feed')}>
          Вернуться к заказам
        </AppButton>
      </div>
    );
  }

  const currentUserId = userProfile?.id;
  const isClient = currentUserId === order.client?.id;
  const isExpert = currentUserId === order.expert?.id;
  
  const plaintiff = userProfile;
  const defendant = isClient ? order.expert : order.client;

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        <AppCard className={styles.mainCard}>
          <Title level={2} className={styles.pageTitle}>
            Подача претензии
          </Title>

          <div className={styles.orderInfoSection}>
            <div className={styles.partiesGridWrapper}>
              {/* Истец */}
              <AppCard className={styles.partyGlassCard}>
                <div className={styles.partyGlassInner}>
                  <Avatar 
                    size={56} 
                    src={plaintiff?.avatar} 
                    icon={<UserOutlined />}
                    className={styles.partyAvatar}
                  />
                  <div className={styles.partyMeta}>
                    <Text strong className={styles.partyNameLink}>
                      {plaintiff?.first_name && plaintiff?.last_name 
                        ? `${plaintiff.first_name} ${plaintiff.last_name}`
                        : plaintiff?.username || 'Неизвестен'}
                    </Text>
                    <div className={styles.partySubline}>
                      <span className={styles.partyRolePill}>{isClient ? 'Заказчик' : 'Исполнитель'}</span>
                      <span className={styles.partyLabelPill}>Истец</span>
                    </div>
                  </div>
                </div>
              </AppCard>

              {/* Ответчик */}
              <AppCard className={styles.partyGlassCard}>
                <div className={styles.partyGlassInner}>
                  <Avatar 
                    size={56} 
                    src={defendant?.avatar} 
                    icon={<UserOutlined />}
                    className={styles.partyAvatar}
                  />
                  <div className={styles.partyMeta}>
                    <Text strong className={styles.partyNameLink}>
                      {defendant?.first_name && defendant?.last_name 
                        ? `${defendant.first_name} ${defendant.last_name}`
                        : defendant?.username || 'Неизвестен'}
                    </Text>
                    <div className={styles.partySubline}>
                      <span className={styles.partyRolePill}>{isClient ? 'Исполнитель' : 'Заказчик'}</span>
                      <span className={styles.partyLabelPill}>Ответчик</span>
                    </div>
                  </div>
                </div>
              </AppCard>
            </div>

            <div className={styles.expertOfferGrid}>
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconBlue}`}>
                  <NumberOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Объект спора</div>
                  <div className={styles.expertOfferValue}>Заказ №{order.id}</div>
                </div>
              </div>
              
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconPurple}`}>
                  <BookOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Предмет</div>
                  <div className={styles.expertOfferValue}>{order.subject?.name || 'Не указан'}</div>
                </div>
              </div>
              
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconOrange}`}>
                  <ReadOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Тип работы</div>
                  <div className={styles.expertOfferValue}>{order.work_type?.name || 'Не указан'}</div>
                </div>
              </div>
              
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconDefault}`}>
                  <ClockCircleOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Дата подачи</div>
                  <div className={styles.expertOfferValue}>{new Date().toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
              
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconGreen}`}>
                  <DollarOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Стоимость заказа</div>
                  <div className={styles.expertOfferValue}>
                    {order.budget ? formatCurrency(Number(order.budget)) : 'Договорная'}
                  </div>
                </div>
              </div>
              
              <div className={styles.expertOfferGridItem}>
                <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconDefault}`}>
                  <DatabaseOutlined />
                </div>
                <div>
                  <div className={styles.expertOfferLabel}>Статус заказа</div>
                  <div className={styles.expertOfferValue}>
                    {order.status === 'new' ? 'Новый' : 
                     order.status === 'in_progress' ? 'В работе' : 
                     order.status === 'completed' ? 'Завершен' : order.status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className={styles.complaintForm}
          >
            <Form.Item
              label="Тип претензии"
              name="complaint_type"
              rules={[{ required: true, message: 'Выберите тип претензии' }]}
            >
              <Select
                size="large"
                placeholder="Выберите тип претензии"
                className={styles.selectField}
              >
                {COMPLAINT_TYPES.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Актуален ли заказ?"
              name="is_order_relevant"
              valuePropName="checked"
              initialValue={true}
            >
              <Select
                size="large"
                className={styles.selectField}
              >
                <Option value={true}>Да, актуален</Option>
                <Option value={false}>Нет, не актуален</Option>
              </Select>
            </Form.Item>

            {isOrderRelevant === true && (
              <Form.Item
                label="Дата, до которой заказ будет актуален"
                name="relevant_until"
                rules={[{ required: isOrderRelevant, message: 'Укажите дату' }]}
              >
                <DatePicker
                  size="large"
                  showTime
                  format="DD.MM.YYYY HH:mm"
                  placeholder="Выберите дату"
                  className={styles.datePickerField}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Финансовые требования"
              name="financial_requirement"
              rules={[{ required: true, message: 'Выберите финансовые требования' }]}
            >
              <Select
                size="large"
                placeholder="Выберите финансовые требования"
                className={styles.selectField}
              >
                {FINANCIAL_REQUIREMENTS.map((req) => (
                  <Option key={req.value} value={req.value}>
                    {req.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {financialRequirement !== 'no_refund' && (
              <Form.Item
                label="Процент возврата"
                name="refund_percent"
                rules={[
                  { type: 'number', min: 0, max: 100, message: 'Процент должен быть от 0 до 100' },
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={100}
                  placeholder="Введите процент возврата"
                  className={styles.numberField}
                  addonAfter="%"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Описание претензии"
              name="description"
              rules={[
                { required: true, message: 'Опишите вашу претензию' },
                { min: 50, message: 'Минимум 50 символов' },
              ]}
            >
              <TextArea
                rows={8}
                placeholder="Подробно опишите суть претензии, обстоятельства дела и ваши требования"
                className={styles.textareaField}
                showCount
                maxLength={3000}
              />
            </Form.Item>

            <Form.Item
              label="Ссылка на заказ"
              name="order_link"
              extra="Ссылка автоматически заполнена"
            >
              <Input
                size="large"
                readOnly
                className={styles.linkField}
                prefix={<LinkOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="Прикрепить файлы"
              name="files"
              extra="Приложите документы, подтверждающие вашу претензию"
            >
              <Upload.Dragger
                name="files"
                multiple
                fileList={fileList}
                onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                beforeUpload={(file) => {
                  const isLt10M = file.size < 10 * 1024 * 1024;
                  if (!isLt10M) {
                    message.error('Максимальный размер файла: 10 МБ');
                    return false;
                  }
                  setFileList(prev => [...prev, file]);
                  return false;
                }}
                onRemove={(file) => {
                  setFileList(prev => prev.filter(f => f.uid !== file.uid));
                }}
                className={styles.uploadArea}
              >
                <div className="ant-upload-drag-icon">
                  <UploadOutlined />
                </div>
                <div className="ant-upload-text">Нажмите или перетащите файлы сюда</div>
                <div className="ant-upload-hint">
                  Поддерживаемые форматы: PDF, DOC, DOCX, JPG, PNG и другие
                </div>
              </Upload.Dragger>
            </Form.Item>

            <Form.Item className={styles.submitButtonWrapper}>
              <Space wrap size={16}>
                <AppButton
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isSubmitting}
                  className={styles.submitButton}
                >
                  Подать претензию
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="large"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Отмена
                </AppButton>
              </Space>
            </Form.Item>
          </Form>
        </AppCard>
      </div>
    </div>
  );
};

export default ComplaintForm;
