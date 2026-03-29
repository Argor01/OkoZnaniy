import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Input, Select, Button, Card, message, Steps, Radio, InputNumber,
  Divider, Typography
} from 'antd';
import {
  ArrowLeftOutlined, FileTextOutlined, UserOutlined, DollarOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { DashboardLayout } from '@/features/layout';
import { adminPanelApi } from '@/features/admin/api';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ClaimFormData {
  claim_type: string;
  subject: string;
  description: string;
  reason: string;
  refund_type: string;
  refund_percentage: number;
  order_id?: number;
  plaintiff_id?: number;
  defendant_id?: number;
}

const ClaimForm: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ClaimFormData>({
    claim_type: 'complaint',
    subject: '',
    description: '',
    reason: 'order_not_completed',
    refund_type: 'none',
    refund_percentage: 0,
  });

  // Получение заказов пользователя для выбора
  const [userOrders, setUserOrders] = useState<any[]>([]);
  
  useEffect(() => {
    const loadUserOrders = async () => {
      try {
        // Загружаем заказы пользователя через orders API
        const response = await fetch('/api/orders/my-orders/', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUserOrders(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
      }
    };
    loadUserOrders();
  }, []);

  const updateFormData = (values: Partial<ClaimFormData>) => {
    setFormData(prev => ({ ...prev, ...values }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      message.error('Пожалуйста, заполните описание претензии');
      return;
    }

    setLoading(true);
    try {
      const claimData: any = {
        claim_type: formData.claim_type,
        subject: formData.subject || `Претензия: ${formData.reason}`,
        description: formData.description,
        reason: formData.reason,
        refund_type: formData.refund_type,
        refund_percentage: formData.refund_percentage,
      };

      if (formData.order_id) {
        claimData.order_id = formData.order_id;
      }

      const response = await fetch('/api/admin-panel/claims/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(claimData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка создания претензии');
      }
      
      message.success('Претензия успешно создана!');
      navigate('/support');
    } catch (error: any) {
      console.error('Ошибка создания претензии:', error);
      message.error(error.response?.data?.message || 'Не удалось создать претензию');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Тип претензии',
      icon: <FileTextOutlined />,
    },
    {
      title: 'Детали',
      icon: <ExclamationCircleOutlined />,
    },
    {
      title: 'Финансы',
      icon: <DollarOutlined />,
    },
    {
      title: 'Проверка',
      icon: <CheckCircleOutlined />,
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Выберите тип претензии
            </Text>
            <Radio.Group
              value={formData.claim_type}
              onChange={(e) => updateFormData({ claim_type: e.target.value })}
              style={{ width: '100%' }}
            >
              <div style={{ marginBottom: 12 }}>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, cursor: 'pointer', background: formData.claim_type === 'complaint' ? '#e6f7ff' : '#fff' }} onClick={() => updateFormData({ claim_type: 'complaint' })}>
                  <Text strong>Жалоба</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Жалоба на качество работы или поведение исполнителя
                  </Text>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, cursor: 'pointer', background: formData.claim_type === 'refund' ? '#e6f7ff' : '#fff' }} onClick={() => updateFormData({ claim_type: 'refund' })}>
                  <Text strong>Возврат средств</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Требование возврата полной или частичной суммы
                  </Text>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, cursor: 'pointer', background: formData.claim_type === 'quality' ? '#e6f7ff' : '#fff' }} onClick={() => updateFormData({ claim_type: 'quality' })}>
                  <Text strong>Качество работы</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Претензии к качеству выполненной работы
                  </Text>
                </div>
              </div>
              <div>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, cursor: 'pointer', background: formData.claim_type === 'other' ? '#e6f7ff' : '#fff' }} onClick={() => updateFormData({ claim_type: 'other' })}>
                  <Text strong>Другое</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Прочие вопросы требующие вмешательства администрации
                  </Text>
                </div>
              </div>
            </Radio.Group>

            {userOrders.length > 0 && (
              <>
                <Divider>Связать с заказом</Divider>
                <Select
                  value={formData.order_id}
                  onChange={(value) => updateFormData({ order_id: value })}
                  placeholder="Выберите заказ (необязательно)"
                  style={{ width: '100%' }}
                  allowClear
                >
                  {userOrders.map((order) => (
                    <Option key={order.id} value={order.id}>
                      Заказ #{order.id} - {order.title}
                    </Option>
                  ))}
                </Select>
              </>
            )}
          </div>
        );

      case 1:
        return (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Причина и описание
            </Text>
            
            <Form layout="vertical" style={{ marginBottom: 16 }}>
              <Form.Item label="Причина претензии" required>
                <Select
                  value={formData.reason}
                  onChange={(value) => updateFormData({ reason: value })}
                  style={{ width: '100%' }}
                >
                  <Option value="order_not_completed">Заказ не выполнен</Option>
                  <Option value="poor_quality">Низкое качество работы</Option>
                  <Option value="deadline_violation">Нарушение сроков</Option>
                  <Option value="contact_violation">Нарушение контактов</Option>
                  <Option value="other">Другое</Option>
                </Select>
              </Form.Item>

              <Form.Item label="Тема" required>
                <Input
                  value={formData.subject}
                  onChange={(e) => updateFormData({ subject: e.target.value })}
                  placeholder="Краткая тема претензии"
                  maxLength={255}
                />
              </Form.Item>

              <Form.Item label="Описание претензии" required>
                <TextArea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Подробно опишите вашу претензию..."
                  rows={6}
                  showCount
                  maxLength={2000}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formData.description.length}/2000 символов
                </Text>
              </Form.Item>
            </Form>
          </div>
        );

      case 2:
        return (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Финансовые требования
            </Text>
            
            <Form layout="vertical">
              <Form.Item label="Тип возврата" required>
                <Radio.Group
                  value={formData.refund_type}
                  onChange={(e) => updateFormData({ refund_type: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Radio value="full">Полный возврат</Radio>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Radio value="partial">Частичный возврат</Radio>
                  </div>
                  <div>
                    <Radio value="none">Без возврата</Radio>
                  </div>
                </Radio.Group>
              </Form.Item>

              {formData.refund_type === 'partial' && (
                <>
                  <Form.Item label="Процент возврата" required>
                    <InputNumber
                      value={formData.refund_percentage}
                      onChange={(value) => updateFormData({ refund_percentage: value || 0 })}
                      min={0}
                      max={100}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}%`}
                      parser={(value) => Number(value?.replace('%', ''))}
                    />
                  </Form.Item>
                  <Form.Item>
                    <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                      <Text type="secondary">
                        Укажите процент от суммы заказа, который вы хотите вернуть.
                      </Text>
                    </div>
                  </Form.Item>
                </>
              )}

              {formData.refund_type === 'full' && (
                <Form.Item>
                  <div style={{ background: '#e6f7ff', padding: 12, borderRadius: 4, border: '1px solid #91d5ff' }}>
                    <Text type="secondary">
                      Будет запрошен полный возврат суммы заказа.
                    </Text>
                  </div>
                </Form.Item>
              )}
            </Form>
          </div>
        );

      case 3:
        return (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
              Проверка данных
            </Text>
            
            <Card size="small" style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Тип претензии:</Text>
                <br />
                <Text strong>
                  {{
                    complaint: 'Жалоба',
                    refund: 'Возврат средств',
                    quality: 'Качество работы',
                    other: 'Другое',
                  }[formData.claim_type]}
                </Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Причина:</Text>
                <br />
                <Text strong>
                  {{
                    order_not_completed: 'Заказ не выполнен',
                    poor_quality: 'Низкое качество работы',
                    deadline_violation: 'Нарушение сроков',
                    contact_violation: 'Нарушение контактов',
                    other: 'Другое',
                  }[formData.reason]}
                </Text>
              </div>
              {formData.subject && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Тема:</Text>
                    <br />
                    <Text>{formData.subject}</Text>
                  </div>
                </>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Описание:</Text>
                <br />
                <Text>{formData.description || 'Не указано'}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Финансовые требования:</Text>
                <br />
                <Text strong>
                  {{
                    full: 'Полный возврат',
                    partial: `Частичный возврат (${formData.refund_percentage}%)`,
                    none: 'Без возврата',
                  }[formData.refund_type]}
                </Text>
              </div>
            </Card>

            <div style={{ background: '#fffbe6', padding: 12, borderRadius: 4, border: '1px solid #ffe58f' }}>
              <Text type="secondary">
                <ExclamationCircleOutlined /> После отправки претензия будет рассмотрена администрацией в ближайшее время.
              </Text>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/support')}
          style={{ marginBottom: 16 }}
        >
          Назад
        </Button>

        <Card title="Подать претензию (Арбитраж)">
          <Steps
            current={currentStep}
            items={steps}
            style={{ marginBottom: 32 }}
          />

          {renderStepContent()}

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button
              disabled={currentStep === 0}
              onClick={prevStep}
            >
              Назад
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                onClick={nextStep}
              >
                Далее
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={loading}
                disabled={!formData.description.trim()}
              >
                Отправить претензию
              </Button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClaimForm;
