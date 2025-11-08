import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Space, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerEmployee, type RegisterEmployeeRequest } from '../../api/directorApi';

const { Option } = Select;
const { Title } = Typography;

const EmployeeRegistration: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);

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
    const data: RegisterEmployeeRequest = {
      email: values.email,
      first_name: values.firstName,
      last_name: values.lastName,
      phone: values.phone || undefined,
      role: values.role,
      password: autoGeneratePassword ? undefined : values.password,
    };

    registerMutation.mutate(data);
  };

  return (
    <div>
      <Card>
        <Title level={4}>Регистрация нового сотрудника</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ maxWidth: 600 }}
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
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="+7 (999) 123-45-67"
              size="large"
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
            <Space>
              <Button
                type="default"
                onClick={handleGeneratePassword}
                icon={<PlusOutlined />}
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
