import React, { useMemo, useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';

const { Title, Paragraph } = Typography;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const isLinkValid = useMemo(() => !!uid && !!token, [uid, token]);

  const onFinish = async (values: { new_password: string; new_password2: string }) => {
    if (!isLinkValid) {
      message.error('Недействительная ссылка для сброса пароля');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPasswordConfirm(uid, token, values.new_password, values.new_password2);
      message.success('Пароль успешно изменен. Вы можете войти.');
      navigate('/login');
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось изменить пароль';
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="auth-card" style={{ maxWidth: 520, width: '100%' }}>
        <div className="auth-right" style={{ width: '100%' }}>
          <div className="auth-panel">
            <div className="panel-body">
              <Title level={3} style={{ marginBottom: 8 }}>Восстановление пароля</Title>
              {!isLinkValid && (
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Ссылка недействительна или устарела. Пожалуйста, запросите новую ссылку на странице входа.
                </Paragraph>
              )}
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                  label="Новый пароль"
                  name="new_password"
                  rules={[
                    { required: true, message: 'Введите новый пароль' },
                    { min: 6, message: 'Минимум 6 символов' },
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder=" " />
                </Form.Item>
                <Form.Item
                  label="Подтвердите пароль"
                  name="new_password2"
                  rules={[
                    { required: true, message: 'Подтвердите пароль' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Пароли не совпадают'));
                      },
                    }),
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder=" " />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block disabled={!isLinkValid} loading={loading}>
                    Изменить пароль
                  </Button>
                </Form.Item>
                <Form.Item>
                  <Button htmlType="button" block onClick={() => navigate('/login')}>
                    Вернуться ко входу
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
