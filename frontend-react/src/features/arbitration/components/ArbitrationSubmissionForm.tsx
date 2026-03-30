import React, { useState } from 'react';
import {
  Steps, Form, Input, Select, Button, Card, Typography, Space,
  InputNumber, Radio, Checkbox, message, Upload, Row, Col
} from 'antd';
import {
  FileTextOutlined, DollarOutlined, SendOutlined,
  UploadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ArbitrationFormData {
  order_id?: number;
  defendant_id?: number;
  subject: string;
  reason: string;
  description: string;
  deadline_relevant: boolean;
  refund_type: 'none' | 'partial' | 'full';
  requested_refund_percentage: number;
  requested_refund_amount?: number;
  evidence_files: any[];
}

interface ArbitrationSubmissionFormProps {
  onSubmit: (data: ArbitrationFormData) => Promise<void>;
  onCancel?: () => void;
  orders?: Array<{ id: number; title: string }>;
  users?: Array<{ id: number; first_name: string; last_name: string }>;
}

export const ArbitrationSubmissionForm: React.FC<ArbitrationSubmissionFormProps> = ({
  onSubmit,
  onCancel,
  orders = [],
  users = []
}) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const reasons = [
    { value: 'order_not_completed', label: 'Заказ не выполнен' },
    { value: 'poor_quality', label: 'Низкое качество работы' },
    { value: 'deadline_violation', label: 'Нарушение сроков' },
    { value: 'payment_dispute', label: 'Спор по оплате' },
    { value: 'contract_violation', label: 'Нарушение условий договора' },
    { value: 'other', label: 'Другое' },
  ];

  const next = async () => {
    try {
      await form.validateFields();
      setCurrent(current + 1);
    } catch (error) {
      message.error('Пожалуйста, заполните все обязательные поля');
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setLoading(true);
      await onSubmit({
        ...values,
        evidence_files: fileList.map(f => ({
          name: f.name,
          url: f.url || '',
          size: f.size
        }))
      });
      
      message.success('Претензия успешно подана');
      form.resetFields();
      setCurrent(0);
    } catch (error: any) {
      message.error(error.message || 'Ошибка при подаче претензии');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Основная информация',
      icon: <FileTextOutlined />,
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form.Item
            name="order_id"
            label="Связанный заказ"
            tooltip="Выберите заказ, к которому относится претензия"
          >
            <Select
              placeholder="Выберите заказ (необязательно)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {orders.map(order => (
                <Option key={order.id} value={order.id}>
                  #{order.id} - {order.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="defendant_id"
            label="Ответчик"
            tooltip="Пользователь, к которому предъявляется претензия"
          >
            <Select
              placeholder="Выберите пользователя (необязательно)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Тема обращения"
            rules={[{ required: true, message: 'Укажите тему обращения' }]}
          >
            <Input
              placeholder="Кратко опишите суть проблемы"
              maxLength={255}
              showCount
            />
          </Form.Item>
        </Space>
      )
    },
    {
      title: 'Причина и описание',
      icon: <InfoCircleOutlined />,
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form.Item
            name="reason"
            label="Причина обращения"
            rules={[{ required: true, message: 'Выберите причину обращения' }]}
          >
            <Select placeholder="Выберите причину">
              {reasons.map(reason => (
                <Option key={reason.value} value={reason.value}>
                  {reason.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Подробное описание проблемы"
            rules={[
              { required: true, message: 'Описание проблемы обязательно для заполнения' },
              { min: 50, message: 'Описание должно содержать минимум 50 символов' }
            ]}
          >
            <TextArea
              placeholder="Опишите ситуацию максимально подробно: что произошло, когда, какие были договоренности, что пошло не так..."
              rows={8}
              maxLength={5000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="deadline_relevant"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>
              Актуальность сроков (проблема связана с нарушением дедлайнов)
            </Checkbox>
          </Form.Item>

          <Form.Item
            label="Доказательства"
            tooltip="Прикрепите скриншоты переписки, файлы, подтверждающие вашу позицию"
          >
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              multiple
            >
              <Button icon={<UploadOutlined />}>Прикрепить файлы</Button>
            </Upload>
          </Form.Item>
        </Space>
      )
    },
    {
      title: 'Финансовые требования',
      icon: <DollarOutlined />,
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Form.Item
            name="refund_type"
            label="Тип возврата"
            rules={[{ required: true, message: 'Выберите тип возврата' }]}
            initialValue="none"
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="none">Без возврата средств</Radio>
                <Radio value="partial">Частичный возврат</Radio>
                <Radio value="full">Полный возврат</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.refund_type !== currentValues.refund_type
            }
          >
            {({ getFieldValue }) => {
              const refundType = getFieldValue('refund_type');
              if (refundType === 'partial') {
                return (
                  <Form.Item
                    name="requested_refund_percentage"
                    label="Процент возврата"
                    rules={[
                      { required: true, message: 'Укажите процент возврата' },
                      { type: 'number', min: 1, max: 100, message: 'От 1 до 100%' }
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      formatter={value => `${value}%`}
                      parser={value => value?.replace('%', '') as any}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                );
              }
              if (refundType === 'full') {
                return (
                  <Form.Item
                    name="requested_refund_percentage"
                    initialValue={100}
                    hidden
                  >
                    <InputNumber />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="requested_refund_amount"
            label="Сумма возврата (необязательно)"
            tooltip="Укажите конкретную сумму, если известна"
          >
            <InputNumber
              min={0}
              precision={2}
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value?.replace(/₽\s?|(,*)/g, '') as any}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Card
            size="small"
            style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}
          >
            <Space direction="vertical" size="small">
              <Text strong>Важная информация:</Text>
              <Paragraph style={{ margin: 0, fontSize: 13 }}>
                • Администрация рассмотрит вашу претензию в течение 3-5 рабочих дней
                <br />
                • Окончательное решение о возврате принимается после изучения всех обстоятельств
                <br />
                • Вы получите уведомление о решении на email
              </Paragraph>
            </Space>
          </Card>
        </Space>
      )
    }
  ];

  return (
    <Card>
      <Title level={3} style={{ marginBottom: 24 }}>
        Подача претензии в арбитраж
      </Title>

      <Steps current={current} style={{ marginBottom: 32 }}>
        {steps.map(item => (
          <Step key={item.title} title={item.title} icon={item.icon} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 800, margin: '0 auto' }}
      >
        <div style={{ minHeight: 400 }}>
          {steps[current].content}
        </div>

        <Row gutter={16} style={{ marginTop: 32 }}>
          <Col span={12}>
            {current > 0 && (
              <Button onClick={prev} block size="large">
                Назад
              </Button>
            )}
          </Col>
          <Col span={12}>
            {current < steps.length - 1 && (
              <Button type="primary" onClick={next} block size="large">
                Далее
              </Button>
            )}
            {current === steps.length - 1 && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                icon={<SendOutlined />}
                block
                size="large"
              >
                Подать претензию
              </Button>
            )}
          </Col>
        </Row>

        {onCancel && (
          <Button
            onClick={onCancel}
            block
            style={{ marginTop: 16 }}
          >
            Отмена
          </Button>
        )}
      </Form>
    </Card>
  );
};
