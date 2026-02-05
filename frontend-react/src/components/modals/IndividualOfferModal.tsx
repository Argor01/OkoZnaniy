import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Input, Button, DatePicker, InputNumber, Typography, Form, Select } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { catalogApi } from '../../api/catalog';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface IndividualOfferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OfferSubmitData) => void;
  loading?: boolean;
}

type OfferSubmitData = {
  description: string;
  work_type_id: number;
  work_type?: string;
  subject_id: number;
  subject?: string;
  cost: number;
  deadline: string | null;
} & Record<string, unknown>;

type OfferFormValues = {
  description: string;
  work_type_id: number;
  subject_id: number;
  cost: number;
  deadline: { toISOString: () => string } | null;
} & Record<string, unknown>;

const IndividualOfferModal: React.FC<IndividualOfferModalProps> = ({ open, onClose, onSubmit, loading }) => {
  const [form] = Form.useForm();

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
    enabled: open,
  });

  const { data: workTypes = [], isLoading: workTypesLoading } = useQuery({
    queryKey: ['work-types'],
    queryFn: () => catalogApi.getWorkTypes(),
    enabled: open,
  });

  const handleFinish = (values: OfferFormValues) => {
    const selectedWorkType = workTypes.find((w) => w.id === values.work_type_id);
    const selectedSubject = subjects.find((s) => s.id === values.subject_id);

    // Format deadline to ISO string or timestamp
    const data: OfferSubmitData = {
      ...values,
      work_type_id: values.work_type_id,
      work_type: selectedWorkType?.name,
      subject_id: values.subject_id,
      subject: selectedSubject?.name,
      deadline: values.deadline ? values.deadline.toISOString() : null,
    };
    onSubmit(data);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
          <Title level={4} style={{ margin: 0 }}>Индивидуальное предложение</Title>
        </div>
      }
      closeIcon={<CloseOutlined />}
    >
      <div style={{ padding: '0 0 20px' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Вы можете отправить покупателю индивидуальное предложение своих услуг.
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
          1. Укажите, какие услуги и в каком объеме будут предоставлены покупателю.
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          2. Опишите свой релевантный опыт. Продемонстрируйте 1-3 примера выполнения похожей работы.
        </Text>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            name="description"
            label={<Text strong>Описание</Text>}
            rules={[{ required: true, message: 'Пожалуйста, введите описание' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Напишите, как вы будете решать задачу клиента" 
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="work_type_id"
            label={<Text strong>Тип работы</Text>}
            rules={[{ required: true, message: 'Укажите тип работы' }]}
          >
            <Select
              placeholder="Выберите тип работы"
              loading={workTypesLoading}
              showSearch
              optionFilterProp="label"
              options={workTypes
                .filter((w) => w.is_active !== false)
                .map((w) => ({ value: w.id, label: w.name }))}
            />
          </Form.Item>

          <Form.Item
            name="subject_id"
            label={<Text strong>Предмет</Text>}
            rules={[{ required: true, message: 'Укажите предмет' }]}
          >
            <Select
              placeholder="Выберите предмет"
              loading={subjectsLoading}
              showSearch
              optionFilterProp="label"
              options={subjects
                .filter((s) => s.is_active !== false)
                .map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>

          <Form.Item
            name="cost"
            label={<Text strong>Стоимость</Text>}
            rules={[{ required: true, message: 'Укажите стоимость' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => value!.replace(/₽\s?|(,*)/g, '')}
              min={500}
              max={2000000}
              placeholder="₽ 500 - 2 000 000"
            />
          </Form.Item>

          <Form.Item
            name="deadline"
            label={<Text strong>Срок выполнения</Text>}
            rules={[{ required: true, message: 'Укажите срок выполнения' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Выберите дату"
              disabledDate={(current) => current && current < dayjs().endOf('day')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'center', marginTop: 24 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ 
                background: '#10B981', 
                borderColor: '#10B981',
                height: 48,
                width: 200,
                fontSize: 16,
                fontWeight: 500
              }}
            >
              Предложить
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default IndividualOfferModal;
