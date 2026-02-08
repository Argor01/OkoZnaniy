import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Space, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerEmployee } from '../../api/directorApi';
import type { RegisterEmployeeRequest } from '../../api/types';

const { Option } = Select;
const { Title } = Typography;

const EmployeeRegistration: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const isMobile = window.innerWidth <= 840;

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    form.setFieldsValue({ password: newPassword });
    setAutoGeneratePassword(false);
    message.success('Пароль сгенерирован');
  };

  const registerMutation = useMutation({
    mutationFn: (data: RegisterEmployeeRequest) => registerEmployee(data),
    onSuccess: () => {
      message.success('Сотрудник успешно зарегистрирован');
      form.resetFields();
      setAutoGeneratePassword(true);
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при регистрации сотрудника';
      message.error(errorMessage);
    },
  });

  const onFinish = (values: any) => {
    // Дополнительная валидация номера телефона
    if (values.phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = values.phone.replace(/[^\d+]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        message.error('Некорректный формат номера телефона');
        return;
      }
      
      // Проверяем длину номера (от 7 до 15 цифр)
      const digitsOnly = cleanPhone.replace(/^\+/, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        message.error('Номер телефона должен содержать от 7 до 15 цифр');
        return;
      }
    }

    const data: RegisterEmployeeRequest = {
      email: values.email,
      first_name: values.firstName,
      last_name: values.lastName,
      phone: values.phone ? values.phone.replace(/[^\d+]/g, '') : undefined,
      role: values.role,
      password: autoGeneratePassword ? undefined : values.password,
    };

    registerMutation.mutate(data);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: isMobile ? '0 12px' : 0 }}>
      <Card style={{ 
        width: '100%', 
        maxWidth: 700,
        borderRadius: isMobile ? 8 : 12,
        padding: isMobile ? '12px' : '24px'
      }}>
        <Title 
          level={isMobile ? 5 : 4} 
          style={{ 
            textAlign: 'center', 
            marginBottom: isMobile ? 16 : 24,
            fontSize: isMobile ? 18 : 20
          }}
        >
          Регистрация нового сотрудника
        </Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="example@mail.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="firstName"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Иван"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Иванов"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[
              {
                pattern: /^\+?[1-9]\d{1,14}$/,
                message: 'Введите корректный номер телефона (только цифры, может начинаться с +)',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+7 (999) 123-45-67"
              size="large"
              onChange={(e) => {
                // Разрешаем только цифры, пробелы, дефисы, скобки и знак +
                const value = e.target.value.replace(/[^+\d\s()-]/g, '');
                form.setFieldsValue({ phone: value });
              }}
              onBlur={(e) => {
                // При потере фокуса очищаем от всех символов кроме цифр и +
                const cleanValue = e.target.value.replace(/[^\d+]/g, '');
                form.setFieldsValue({ phone: cleanValue });
              }}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              placeholder="Выберите роль"
              size="large"
            >
              <Option value="admin">Администратор</Option>
              <Option value="arbitrator">Арбитр</Option>
              <Option value="partner">Партнёр</Option>
              <Option value="expert">Эксперт</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: !autoGeneratePassword, message: 'Введите пароль или используйте автогенерацию' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={autoGeneratePassword ? 'Пароль будет сгенерирован автоматически' : 'Введите пароль'}
              size="large"
              disabled={autoGeneratePassword}
            />
          </Form.Item>

          <Form.Item>
            <Space 
              direction={isMobile ? 'vertical' : 'horizontal'}
              style={{ 
                width: '100%',
                justifyContent: isMobile ? 'stretch' : 'flex-start'
              }}
              size={isMobile ? 'middle' : 'small'}
            >
              <Button
                type="default"
                onClick={handleGeneratePassword}
                icon={<PlusOutlined />}
                style={{
                  width: isMobile ? '100%' : 'auto',
                  height: isMobile ? 40 : 'auto'
                }}
                size={isMobile ? 'large' : 'middle'}
              >
                Сгенерировать пароль
              </Button>
              <Button
                type="link"
                onClick={() => {
                  setAutoGeneratePassword(!autoGeneratePassword);
                  if (autoGeneratePassword) {
                    form.setFieldsValue({ password: '' });
                  }
                }}
                style={{
                  width: isMobile ? '100%' : 'auto',
                  height: isMobile ? 40 : 'auto',
                  textAlign: isMobile ? 'center' : 'left',
                  padding: isMobile ? '8px 15px' : '4px 15px'
                }}
                size={isMobile ? 'large' : 'middle'}
              >
                {autoGeneratePassword ? 'Ввести пароль вручную' : 'Автогенерация пароля'}
              </Button>
            </Space>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerMutation.isPending}
              size="large"
              block
              style={{
                height: isMobile ? 48 : 40,
                fontSize: isMobile ? 16 : 14,
                fontWeight: 500
              }}
            >
              Зарегистрировать сотрудника
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EmployeeRegistration;
