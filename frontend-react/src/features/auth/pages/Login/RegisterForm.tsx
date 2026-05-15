import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import type { RegisterRequest } from '@/features/auth/api/auth';
import SocialLoginButtons from '../../components/SocialLoginButtons';
import styles from '@/features/auth/Login.module.css';

interface RegisterFormProps {
  loading: boolean;
  referralCode: string;
  onRegister: (values: RegisterRequest) => void;
  onTelegramAuth: (user: any) => void;
  onTelegramError: (error: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  loading,
  referralCode,
  onRegister,
  onTelegramAuth,
  onTelegramError,
}) => {
  const [form] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState<'client' | 'expert'>('client');

  useEffect(() => {
    if (referralCode) {
      form.setFieldsValue({ referral_code: referralCode });
    }
  }, [referralCode, form]);

  useEffect(() => {
    const savedReferralCode = localStorage.getItem('referral_code');
    if (savedReferralCode) {
      form.setFieldsValue({ referral_code: savedReferralCode });
    }
  }, [form]);

  return (
    <>
      {referralCode && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 4,
        }}>
          <p style={{ margin: 0, color: '#52c41a', fontWeight: 500 }}>
            ✓ Реферальный код: <strong>{referralCode}</strong>
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#389e0d' }}>
            Вы регистрируетесь по приглашению партнера
          </p>
        </div>
      )}
      <Form form={form} onFinish={onRegister} layout="vertical">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { type: 'email', message: 'Некорректный email' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const phone = getFieldValue('phone');
                if (!value && !phone) return Promise.reject(new Error('Укажите email'));
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" />
        </Form.Item>
        <Form.Item
          label="Пароль"
          name="password"
          rules={[{ required: true, message: 'Введите пароль' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
        </Form.Item>
        <Form.Item
          label="Подтвердите пароль"
          name="password2"
          rules={[
            { required: true, message: 'Подтвердите пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Подтвердите пароль" />
        </Form.Item>
        <Form.Item name="role" initialValue="client" rules={[{ required: true, message: 'Выберите роль' }]} hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item label="Роль">
          <div className={styles.roleSwitch} role="group" aria-label="Выбор роли">
            <div className={`role-indicator ${selectedRole === 'expert' ? 'expert' : 'client'}`} />
            <button
              type="button"
              className={`role-option ${selectedRole === 'client' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('client'); form.setFieldsValue({ role: 'client' }); }}
            >
              Клиент
            </button>
            <button
              type="button"
              className={`role-option ${selectedRole === 'expert' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('expert'); form.setFieldsValue({ role: 'expert' }); }}
            >
              Исполнитель
            </button>
          </div>
        </Form.Item>
        <Form.Item name="referral_code" label="Реферальный код (необязательно)">
          <Input placeholder="Реферальный код" />
        </Form.Item>
        <Form.Item
          name="agreement"
          valuePropName="checked"
          style={{ marginBottom: 8 }}
          rules={[{
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject(new Error('Необходимо принять согласие на обработку персональных данных')),
          }]}
        >
          <Checkbox>
            Я предоставляю своё согласие на <a href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#6435a5' }}>обработку персональных данных</a> в соответствии с <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#6435a5' }}>Политикой обработки персональных данных</a>
          </Checkbox>
        </Form.Item>
        <Form.Item
          name="userAgreement"
          valuePropName="checked"
          style={{ marginBottom: 8 }}
          rules={[{
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject(new Error('Необходимо принять пользовательское соглашение')),
          }]}
        >
          <Checkbox>
            Я принимаю <a href={selectedRole === 'client' ? "/docs/user_agreement_client.pdf" : "/docs/user_agreement_expert.pdf"} target="_blank" rel="noopener noreferrer" style={{ color: '#6435a5' }}>пользовательское соглашение</a>
          </Checkbox>
        </Form.Item>
        <Form.Item name="newsletter" valuePropName="checked" style={{ marginBottom: 16 }}>
          <Checkbox>
            Я предоставляю своё <a href="/docs/advertising_consent.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#6435a5' }}>согласие на получение новостной и рекламной рассылки</a>
          </Checkbox>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Зарегистрироваться
          </Button>
        </Form.Item>
        <Form.Item>
          <SocialLoginButtons
            onTelegramAuth={onTelegramAuth}
            onTelegramError={onTelegramError}
          />
        </Form.Item>
      </Form>
    </>
  );
};

export default RegisterForm;
