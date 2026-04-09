import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { DashboardLayout } from '@/features/layout';
import { ordersApi } from '@/features/orders/api/orders';
import { supportRequestsApi } from '@/features/support/api/requests';

const { Paragraph, Title } = Typography;

type SupportMode = 'support' | 'arbitration';

interface FormValues {
  mode: SupportMode;
  subject: string;
  description: string;
  order_id?: number;
  reason?: string;
  refund_type?: 'full' | 'partial' | 'none';
  refund_percentage?: number;
}

const defaultDescriptionByMode: Record<SupportMode, string> = {
  support: '',
  arbitration: '',
};

const ClaimForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = React.useState(false);
  const [orders, setOrders] = React.useState<Array<{ id: number; title?: string }>>([]);

  const initialMode = (searchParams.get('mode') === 'arbitration' ? 'arbitration' : 'support') as SupportMode;
  const initialOrderId = Number(searchParams.get('orderId') || '');

  React.useEffect(() => {
    form.setFieldsValue({
      mode: initialMode,
      order_id: Number.isFinite(initialOrderId) && initialOrderId > 0 ? initialOrderId : undefined,
      refund_type: initialMode === 'arbitration' ? 'none' : undefined,
      description: defaultDescriptionByMode[initialMode],
    });
  }, [form, initialMode, initialOrderId]);

  React.useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await ordersApi.getMyOrders({ ordering: '-created_at' });
        const items = Array.isArray(response)
          ? response
          : Array.isArray((response as { results?: Array<{ id: number; title?: string }> })?.results)
            ? (response as { results: Array<{ id: number; title?: string }> }).results
            : [];
        setOrders(items);
      } catch {
        setOrders([]);
      }
    };

    void loadOrders();
  }, []);

  const mode = Form.useWatch('mode', form) ?? initialMode;
  const refundType = Form.useWatch('refund_type', form) ?? 'none';

  const handleSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      if (values.mode === 'support') {
        await supportRequestsApi.createSupportRequest({
          subject: values.subject,
          description: values.description,
        });
        message.success('Обращение отправлено в поддержку');
      } else {
        await supportRequestsApi.createClaim({
          claim_type: 'complaint',
          subject: values.subject,
          description: values.description,
          order_id: values.order_id,
          reason: values.reason ?? 'other',
          refund_type: values.refund_type ?? 'none',
          refund_percentage: values.refund_type === 'partial' ? values.refund_percentage ?? 0 : 0,
        });
        message.success('Жалоба передана в арбитраж');
      }

      navigate('/support');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { detail?: string; error?: string } } };
      message.error(apiError?.response?.data?.detail || apiError?.response?.data?.error || 'Не удалось отправить обращение');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 16px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/support')}
          style={{ marginBottom: 16 }}
        >
          Назад к обращениям
        </Button>

        <Card>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div>
              <Title level={3} style={{ marginBottom: 8 }}>Форма обращения</Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Здесь можно быстро отправить обычный вопрос в поддержку или открыть арбитражный спор по заказу.
              </Paragraph>
            </div>

            <Alert
              type={mode === 'arbitration' ? 'warning' : 'info'}
              showIcon
              icon={mode === 'arbitration' ? <ExclamationCircleOutlined /> : <CustomerServiceOutlined />}
              message={mode === 'arbitration' ? 'Арбитраж по заказу' : 'Обычное обращение'}
              description={
                mode === 'arbitration'
                  ? 'Используйте этот режим, если вопрос связан с заказом, сроками, исполнением или возвратом денег.'
                  : 'Используйте этот режим для обычных вопросов по сервису, аккаунту, оплате или работе платформы.'
              }
            />

            <Form<FormValues>
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                mode: initialMode,
                refund_type: 'none',
              }}
            >
              <Form.Item
                name="mode"
                label="Тип обращения"
                rules={[{ required: true, message: 'Выберите тип обращения' }]}
              >
                <Select
                  options={[
                    { value: 'support', label: 'Обычное обращение' },
                    { value: 'arbitration', label: 'Арбитраж по заказу' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="subject"
                label="Тема"
                rules={[{ required: true, message: 'Укажите тему обращения' }]}
              >
                <Input placeholder="Коротко опишите, с чем нужна помощь" maxLength={255} />
              </Form.Item>

              <Form.Item
                name="description"
                label="Описание"
                rules={[{ required: true, message: 'Опишите ситуацию' }]}
              >
                <Input.TextArea
                  rows={7}
                  maxLength={3000}
                  showCount
                  placeholder={
                    mode === 'arbitration'
                      ? 'Опишите, что произошло по заказу, какие были договоренности и что вы ожидаете по итогу.'
                      : 'Опишите вопрос как можно понятнее. Если уже были действия или ошибки, тоже укажите их.'
                  }
                />
              </Form.Item>

              {mode === 'support' ? null : (
                <>
                  <Form.Item
                    name="order_id"
                    label="Связанный заказ"
                    rules={[{ required: true, message: 'Выберите заказ для арбитража' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Выберите заказ"
                      options={orders.map((order) => ({
                        value: order.id,
                        label: `Заказ #${order.id}${order.title ? ` - ${order.title}` : ''}`,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item
                    name="reason"
                    label="Причина спора"
                    rules={[{ required: true, message: 'Выберите причину' }]}
                  >
                    <Select
                      options={[
                        { value: 'order_not_completed', label: 'Заказ не выполнен' },
                        { value: 'poor_quality', label: 'Низкое качество работы' },
                        { value: 'deadline_violation', label: 'Нарушение сроков' },
                        { value: 'contract_violation', label: 'Нарушение договоренностей' },
                        { value: 'other', label: 'Другое' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="refund_type" label="Что требуется по деньгам">
                    <Select
                      options={[
                        { value: 'none', label: 'Возврат не требуется' },
                        { value: 'full', label: 'Полный возврат' },
                        { value: 'partial', label: 'Частичный возврат' },
                      ]}
                    />
                  </Form.Item>

                  {refundType === 'partial' ? (
                    <Form.Item
                      name="refund_percentage"
                      label="Процент возврата"
                      rules={[{ required: true, message: 'Укажите процент возврата' }]}
                    >
                      <Select
                        options={[
                          { value: 10, label: '10%' },
                          { value: 25, label: '25%' },
                          { value: 50, label: '50%' },
                          { value: 75, label: '75%' },
                          { value: 100, label: '100%' },
                        ]}
                      />
                    </Form.Item>
                  ) : null}
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CheckCircleOutlined />}
                  loading={submitting}
                >
                  {mode === 'arbitration' ? 'Отправить в арбитраж' : 'Отправить обращение'}
                </Button>
              </div>
            </Form>

            <Alert
              type="success"
              showIcon
              message="После отправки"
              description="После отправки откройте вкладку сообщений и зайдите в раздел поддержки. Там будет видно ваше обращение, его статус, ответы поддержки и ход решения."
            />
          </Space>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClaimForm;
