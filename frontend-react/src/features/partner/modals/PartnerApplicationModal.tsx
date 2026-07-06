import React, { useState } from 'react';
import { Modal, Form, Input, Result } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { partnerApplicationsApi } from '../api/partnerApplications';

interface PartnerApplicationModalProps {
  visible: boolean;
  onClose: () => void;
}

const extractError = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (typeof value === 'string' && value) return value;
  }
  return fallback;
};

const PartnerApplicationModal: React.FC<PartnerApplicationModalProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: partnerApplicationsApi.create,
    onSuccess: () => {
      setErrorMsg('');
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      setErrorMsg(extractError(error, 'Не удалось отправить заявку. Попробуйте позже.'));
    },
  });

  const handleClose = () => {
    form.resetFields();
    setSubmitted(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      title={submitted ? null : 'Заявка на партнёрство'}
      open={visible}
      onCancel={handleClose}
      onOk={submitted ? handleClose : () => form.submit()}
      okText={submitted ? 'Готово' : 'Отправить заявку'}
      cancelButtonProps={submitted ? { style: { display: 'none' } } : undefined}
      cancelText="Отмена"
      confirmLoading={mutation.isPending}
      destroyOnClose
      width={520}
    >
      {submitted ? (
        <Result
          status="success"
          title="Заявка отправлена!"
          subTitle="Спасибо за интерес к партнёрству. Мы рассмотрим вашу заявку и свяжемся с вами в ближайшее время."
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => mutation.mutate(values)}
        >
          <p style={{ marginTop: 0, marginBottom: 16, color: '#6b7280' }}>
            Оставьте контакты — расскажем об условиях и поможем запустить агентство.
          </p>
          <Form.Item
            label="ФИО"
            name="full_name"
            rules={[{ required: true, message: 'Укажите ваше ФИО' }, { min: 3, message: 'Укажите ФИО полностью' }]}
          >
            <Input placeholder="Иванов Иван Иванович" size="large" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Укажите email' }, { type: 'email', message: 'Введите корректный email' }]}
          >
            <Input placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item
            label="Telegram"
            name="telegram"
            rules={[{ required: true, message: 'Укажите Telegram для связи' }]}
          >
            <Input placeholder="@username" size="large" />
          </Form.Item>
          <Form.Item label="Телефон (необязательно)" name="phone">
            <Input placeholder="+7 (999) 123-45-67" size="large" />
          </Form.Item>
          {errorMsg && <p style={{ color: '#dc2626', marginBottom: 0 }}>{errorMsg}</p>}
        </Form>
      )}
    </Modal>
  );
};

export default PartnerApplicationModal;
