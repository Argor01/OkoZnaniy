import React, { useState } from 'react';
import { Form, Select, Input, Button, Space, message, Checkbox, Upload, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { DecisionRequest } from '../../api/types';

const { TextArea } = Input;
const { Option } = Select;

interface DecisionFormProps {
  claimId: number;
  orderAmount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: Partial<DecisionRequest>;
}

const DecisionForm: React.FC<DecisionFormProps> = ({
  claimId,
  orderAmount,
  onSuccess,
  onCancel,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [decisionType, setDecisionType] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const decisionData: DecisionRequest = {
        decision_type: values.decision_type,
        reasoning: values.reasoning,
        client_comment: values.client_comment,
        expert_comment: values.expert_comment,
        require_approval: values.require_approval || false,
        refund_amount: values.refund_amount,
      };

      
      await arbitratorApi.makeDecision(claimId, decisionData);

      message.success('Решение успешно принято');
      form.resetFields();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Ошибка при принятии решения');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionTypeChange = (value: string) => {
    setDecisionType(value);
    
    if (value !== 'partial_refund') {
      form.setFieldsValue({ refund_amount: undefined });
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={initialValues}
    >
      <Form.Item
        name="decision_type"
        label="Тип решения"
        rules={[{ required: true, message: 'Выберите тип решения' }]}
      >
        <Select
          placeholder="Выберите тип решения"
          onChange={handleDecisionTypeChange}
        >
          <Option value="full_refund">Полный возврат средств клиенту</Option>
          <Option value="partial_refund">Частичный возврат средств</Option>
          <Option value="no_refund">Отказ в возврате</Option>
          <Option value="revision">Возврат заказа на доработку эксперту</Option>
          <Option value="other">Другое</Option>
        </Select>
      </Form.Item>

      {decisionType === 'partial_refund' && (
        <Form.Item
          name="refund_amount"
          label="Сумма возврата"
          rules={[
            { required: true, message: 'Укажите сумму возврата' },
            { type: 'number', min: 1, message: 'Сумма должна быть больше 0' },
            {
              type: 'number',
              max: orderAmount,
              message: `Сумма не может превышать ${orderAmount.toLocaleString()} ₽`,
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Введите сумму возврата"
            min={1}
            max={orderAmount}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            parser={(value) => Number((value ?? '').replace(/\s?/g, ''))}
            suffix="₽"
          />
        </Form.Item>
      )}

      <Form.Item
        name="reasoning"
        label="Обоснование решения"
        rules={[
          { required: true, message: 'Укажите обоснование решения' },
          { min: 10, message: 'Обоснование должно содержать минимум 10 символов' },
        ]}
      >
        <TextArea
          rows={4}
          placeholder="Опишите обоснование вашего решения..."
          showCount
          maxLength={2000}
        />
      </Form.Item>

      <Form.Item
        name="client_comment"
        label="Комментарий для клиента (опционально)"
      >
        <TextArea
          rows={3}
          placeholder="Комментарий, который увидит клиент..."
          showCount
          maxLength={1000}
        />
      </Form.Item>

      <Form.Item
        name="expert_comment"
        label="Комментарий для эксперта (опционально)"
      >
        <TextArea
          rows={3}
          placeholder="Комментарий, который увидит эксперт..."
          showCount
          maxLength={1000}
        />
      </Form.Item>

      <Form.Item
        name="require_approval"
        valuePropName="checked"
      >
        <Checkbox
          checked={requireApproval}
          onChange={(e) => setRequireApproval(e.target.checked)}
        >
          Требуется согласование дирекции
        </Checkbox>
      </Form.Item>

      <Form.Item
        name="attachments"
        label="Прикрепленные файлы (опционально)"
      >
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          multiple
        >
          <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Принять решение
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>Отмена</Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DecisionForm;

