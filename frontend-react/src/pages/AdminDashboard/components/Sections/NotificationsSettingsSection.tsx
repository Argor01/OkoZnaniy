import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Form, 
  Input, 
  Select,
  Switch,
  Modal,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Tabs,
  Tag,
  Tooltip,
  Popconfirm,
  Alert,
  TimePicker,
  Checkbox
} from 'antd';
import { 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SendOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface NotificationTemplate {
  id: number;
  name: string;
  description: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  trigger: 'order_created' | 'order_completed' | 'payment_received' | 'dispute_opened' | 'user_registered' | 'custom';
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
  send_delay_minutes?: number;
  recipient_type: 'user' | 'expert' | 'admin' | 'all';
  created_at: string;
  updated_at: string;
}

interface NotificationSettings {
  id: number;
  setting_key: string;
  setting_name: string;
  setting_value: boolean | string | number;
  description: string;
  category: 'email' | 'sms' | 'push' | 'system';
}

interface NotificationSchedule {
  id: number;
  name: string;
  description: string;
  template_id: number;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_time: string;
  schedule_days?: number[];
  is_active: boolean;
  last_sent?: string;
  next_send?: string;
}

interface NotificationsSettingsSectionProps {
  templates?: NotificationTemplate[];
  settings?: NotificationSettings[];
  schedules?: NotificationSchedule[];
  loading?: boolean;
  onCreateTemplate?: (templateData: Partial<NotificationTemplate>) => void;
  onUpdateTemplate?: (templateId: number, templateData: Partial<NotificationTemplate>) => void;
  onDeleteTemplate?: (templateId: number) => void;
  onUpdateSettings?: (settings: Partial<NotificationSettings>[]) => void;
  onCreateSchedule?: (scheduleData: Partial<NotificationSchedule>) => void;
  onUpdateSchedule?: (scheduleId: number, scheduleData: Partial<NotificationSchedule>) => void;
  onDeleteSchedule?: (scheduleId: number) => void;
  onTestTemplate?: (templateId: number, testData: any) => void;
}

export const NotificationsSettingsSection: React.FC<NotificationsSettingsSectionProps> = ({
  templates = [],
  settings = [],
  schedules = [],
  loading = false,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onUpdateSettings,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onTestTemplate,
}) => {
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<NotificationSchedule | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [testForm] = Form.useForm();

  const templatesData = templates;
  const settingsData = settings;
  const schedulesData = schedules;

  // Обработчики для шаблонов
  const handleCreateTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      onCreateTemplate?.(values);
      setTemplateModalVisible(false);
      templateForm.resetFields();
      message.success('Шаблон создан');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      if (editingTemplate) {
        onUpdateTemplate?.(editingTemplate.id, values);
        setTemplateModalVisible(false);
        setEditingTemplate(null);
        templateForm.resetFields();
        message.success('Шаблон обновлен');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue(template);
    setTemplateModalVisible(true);
  };

  const handleDeleteTemplate = (templateId: number) => {
    onDeleteTemplate?.(templateId);
    message.success('Шаблон удален');
  };

  const handleTestTemplate = (template: NotificationTemplate) => {
    setTestingTemplate(template);
    testForm.resetFields();
    setTestModalVisible(true);
  };

  const handleSendTest = async () => {
    try {
      const values = await testForm.validateFields();
      if (testingTemplate) {
        onTestTemplate?.(testingTemplate.id, values);
        setTestModalVisible(false);
        setTestingTemplate(null);
        testForm.resetFields();
        message.success('Тестовое уведомление отправлено');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Функции для отображения
  const getTypeIcon = (type: string) => {
    const icons = {
      email: <MailOutlined />,
      sms: <MessageOutlined />,
      push: <MobileOutlined />,
      in_app: <BellOutlined />,
    };
    return icons[type as keyof typeof icons] || <BellOutlined />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      email: 'blue',
      sms: 'green',
      push: 'orange',
      in_app: 'purple',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      email: 'Email',
      sms: 'SMS',
      push: 'Push',
      in_app: 'В приложении',
    };
    return texts[type as keyof typeof texts] || 'Неизвестно';
  };

  const getTriggerText = (trigger: string) => {
    const texts = {
      order_created: 'Создание заказа',
      order_completed: 'Завершение заказа',
      payment_received: 'Получение платежа',
      dispute_opened: 'Открытие спора',
      user_registered: 'Регистрация пользователя',
      custom: 'Пользовательский',
    };
    return texts[trigger as keyof typeof texts] || 'Неизвестно';
  };

  const getRecipientText = (recipient: string) => {
    const texts = {
      user: 'Пользователи',
      expert: 'Эксперты',
      admin: 'Администраторы',
      all: 'Все',
    };
    return texts[recipient as keyof typeof texts] || 'Неизвестно';
  };

  // Колонки для таблицы шаблонов
  const templateColumns = [
    {
      title: 'Название',
      key: 'name',
      render: (record: NotificationTemplate) => (
        <div>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
            {getTypeIcon(record.type)}
            {record.name}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
      width: 250,
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)} icon={getTypeIcon(type)}>
          {getTypeText(type)}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Триггер',
      dataIndex: 'trigger',
      key: 'trigger',
      render: (trigger: string) => getTriggerText(trigger),
      width: 150,
    },
    {
      title: 'Получатели',
      dataIndex: 'recipient_type',
      key: 'recipient_type',
      render: (recipient: string) => (
        <Tag>{getRecipientText(recipient)}</Tag>
      ),
      width: 120,
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: NotificationTemplate) => (
        <Space>
          <Tooltip title="Тестировать">
            <Button 
              size="small" 
              icon={<SendOutlined />}
              onClick={() => handleTestTemplate(record)}
            />
          </Tooltip>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditTemplate(record)}
          />
          <Popconfirm
            title="Удалить шаблон?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteTemplate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
      width: 120,
      fixed: 'right' as const,
    },
  ];

  return (
    <div>
      <Alert
        message="Настройки уведомлений"
        description="Управление шаблонами уведомлений, глобальными настройками и расписанием отправки. Изменения влияют на все уведомления системы."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs defaultActiveKey="templates">
        <TabPane tab="Шаблоны уведомлений" key="templates">
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Шаблоны уведомлений</span>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingTemplate(null);
                    templateForm.resetFields();
                    setTemplateModalVisible(true);
                  }}
                >
                  Создать шаблон
                </Button>
              </div>
            }
          >
            <Table
              columns={templateColumns}
              dataSource={templatesData}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} из ${total} шаблонов`,
              }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Глобальные настройки" key="settings">
          <Card title="Глобальные настройки уведомлений">
            <Row gutter={16}>
              {settingsData.map(setting => (
                <Col span={12} key={setting.id} style={{ marginBottom: 16 }}>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{setting.setting_name}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {setting.description}
                        </Text>
                      </div>
                      <div>
                        {typeof setting.setting_value === 'boolean' ? (
                          <Switch 
                            checked={setting.setting_value}
                            onChange={(checked) => {
                              // Обновление настройки
                              console.log('Update setting:', setting.setting_key, checked);
                            }}
                          />
                        ) : (
                          <Input 
                            value={setting.setting_value as string}
                            style={{ width: 200 }}
                            onChange={(e) => {
                              // Обновление настройки
                              console.log('Update setting:', setting.setting_key, e.target.value);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="Расписание" key="schedules">
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Расписание отправки</span>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSchedule(null);
                    scheduleForm.resetFields();
                    setScheduleModalVisible(true);
                  }}
                >
                  Создать расписание
                </Button>
              </div>
            }
          >
            <Table
              dataSource={schedulesData}
              rowKey="id"
              loading={loading}
              columns={[
                {
                  title: 'Название',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Тип расписания',
                  dataIndex: 'schedule_type',
                  key: 'schedule_type',
                },
                {
                  title: 'Время',
                  dataIndex: 'schedule_time',
                  key: 'schedule_time',
                },
                {
                  title: 'Последняя отправка',
                  dataIndex: 'last_sent',
                  key: 'last_sent',
                  render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '—',
                },
                {
                  title: 'Следующая отправка',
                  dataIndex: 'next_send',
                  key: 'next_send',
                  render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '—',
                },
                {
                  title: 'Статус',
                  dataIndex: 'is_active',
                  key: 'is_active',
                  render: (isActive: boolean) => (
                    <Tag color={isActive ? 'green' : 'red'}>
                      {isActive ? 'Активно' : 'Неактивно'}
                    </Tag>
                  ),
                },
              ]}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Модальное окно создания/редактирования шаблона */}
      <Modal
        title={editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон'}
        open={templateModalVisible}
        onOk={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        onCancel={() => {
          setTemplateModalVisible(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
        okText={editingTemplate ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        width={800}
      >
        <Form form={templateForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Название шаблона"
                rules={[{ required: true, message: 'Введите название шаблона' }]}
              >
                <Input placeholder="Например: Подтверждение заказа" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Тип уведомления"
                rules={[{ required: true, message: 'Выберите тип уведомления' }]}
              >
                <Select placeholder="Выберите тип">
                  <Option value="email">Email</Option>
                  <Option value="sms">SMS</Option>
                  <Option value="push">Push уведомление</Option>
                  <Option value="in_app">В приложении</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input placeholder="Краткое описание назначения шаблона" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="trigger"
                label="Триггер"
                rules={[{ required: true, message: 'Выберите триггер' }]}
              >
                <Select placeholder="Выберите событие">
                  <Option value="order_created">Создание заказа</Option>
                  <Option value="order_completed">Завершение заказа</Option>
                  <Option value="payment_received">Получение платежа</Option>
                  <Option value="dispute_opened">Открытие спора</Option>
                  <Option value="user_registered">Регистрация пользователя</Option>
                  <Option value="custom">Пользовательский</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recipient_type"
                label="Получатели"
                rules={[{ required: true, message: 'Выберите получателей' }]}
              >
                <Select placeholder="Выберите получателей">
                  <Option value="user">Пользователи</Option>
                  <Option value="expert">Эксперты</Option>
                  <Option value="admin">Администраторы</Option>
                  <Option value="all">Все</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subject"
            label="Тема (для email)"
          >
            <Input placeholder="Тема письма (поддерживает переменные {variable})" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Содержание"
            rules={[{ required: true, message: 'Введите содержание уведомления' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Текст уведомления (поддерживает переменные {variable})"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно тестирования шаблона */}
      <Modal
        title="Тестировать шаблон"
        open={testModalVisible}
        onOk={handleSendTest}
        onCancel={() => {
          setTestModalVisible(false);
          setTestingTemplate(null);
          testForm.resetFields();
        }}
        okText="Отправить тест"
        cancelText="Отмена"
      >
        {testingTemplate && (
          <div>
            <Alert
              message={`Тестирование шаблона: ${testingTemplate.name}`}
              description={`Тип: ${getTypeText(testingTemplate.type)}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Form form={testForm} layout="vertical">
              <Form.Item
                name="test_recipient"
                label="Получатель для теста"
                rules={[{ required: true, message: 'Введите получателя' }]}
              >
                <Input 
                  placeholder={
                    testingTemplate.type === 'email' ? 'email@example.com' :
                    testingTemplate.type === 'sms' ? '+7 (999) 123-45-67' :
                    'ID пользователя'
                  }
                />
              </Form.Item>

              {testingTemplate.variables.length > 0 && (
                <div>
                  <Divider>Тестовые значения переменных</Divider>
                  {testingTemplate.variables.map(variable => (
                    <Form.Item
                      key={variable}
                      name={['variables', variable]}
                      label={`{${variable}}`}
                    >
                      <Input placeholder={`Тестовое значение для ${variable}`} />
                    </Form.Item>
                  ))}
                </div>
              )}
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};