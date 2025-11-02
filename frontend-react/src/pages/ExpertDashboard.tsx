import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Typography, Tag, message, Upload, Space, InputNumber, Input, Spin, Modal, Form, InputNumber as AntInputNumber, Row, Col } from 'antd';
import { UploadOutlined, UserOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, LogoutOutlined, EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ordersApi, type Order, type OrderComment } from '../api/orders';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { expertsApi, type ExpertApplication, type Education } from '../api/experts';
import styles from './ExpertDashboard.module.css';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  avatar?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  is_verified?: boolean;
}

const { Title, Text } = Typography;

const ExpertDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [bidLoading, setBidLoading] = useState<Record<number, boolean>>({});
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form] = Form.useForm();
  const [applicationForm] = Form.useForm();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['available-orders'],
    queryFn: () => ordersApi.getAvailableOrders(),
  });

  const { data: myInProgress } = useQuery({
    queryKey: ['my-orders-in-progress'],
    queryFn: () => ordersApi.getMyOrders({ status: 'in_progress' }),
  });

  const { data: myCompleted } = useQuery({
    queryKey: ['my-orders-completed'],
    queryFn: () => ordersApi.getMyOrders({ status: 'completed' }),
  });

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загружаем анкету эксперта
  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ['expert-application'],
    queryFn: async () => {
      const app = await expertsApi.getMyApplication();
      return app;
    },
    retry: false,
    onError: () => {
      // Анкета не найдена - это нормально, значит её ещё нет
    }
  });

  React.useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  // Автоматически открываем форму анкеты, если её нет
  React.useEffect(() => {
    if (!applicationLoading && !application && userProfile?.role === 'expert') {
      // Можно открыть форму автоматически или показать призыв к действию
    }
  }, [application, applicationLoading, userProfile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'in_progress': return 'orange';
      case 'review': return 'purple';
      case 'revision': return 'magenta';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Создан';
      case 'in_progress': return 'В работе';
      case 'review': return 'На проверке';
      case 'revision': return 'На доработке';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const takeMutation = useMutation({
    mutationFn: (orderId: number) => ordersApi.takeOrder(orderId),
    onSuccess: () => {
      message.success('Заказ взят в работу');
      queryClient.invalidateQueries({ queryKey: ['available-orders'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось взять заказ');
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: (data: any) => expertsApi.createApplication(data),
    onSuccess: () => {
      message.success('Анкета успешно создана');
      setApplicationModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['expert-application'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось создать анкету');
    },
  });

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />;
      case 'approved': return <CheckCircleOutlined />;
      case 'rejected': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  if (isLoading) return <Text>Загрузка...</Text>;
  if (isError) return <Text type="danger">Ошибка загрузки заказов</Text>;

  const orders: Order[] = data || [];

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Личный кабинет эксперта</h1>
          <Space>
            <Button 
              icon={<EditOutlined />}
              className={styles.buttonSecondary}
              onClick={() => setProfileModalVisible(true)}
            >
              Редактировать профиль
            </Button>
            <Button 
              icon={<ArrowLeftOutlined />}
              className={styles.buttonSecondary}
              onClick={() => navigate(-1)}
            >
              Назад
            </Button>
            <Button
              icon={<LogoutOutlined />}
              className={styles.buttonDanger}
              onClick={() => {
                authApi.logout();
                navigate('/');
                window.location.reload();
              }}
            >
              Выйти
            </Button>
          </Space>
        </div>

        {/* Application Status Display */}
        {applicationLoading ? (
          <div className={styles.card} style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : application ? (
          <div className={styles.applicationCard}>
            <div className={styles.applicationHeader}>
              <div>
                <h3 className={styles.applicationTitle}>Анкета</h3>
                <p className={styles.applicationSubtitle}>Статус рассмотрения</p>
              </div>
              <div 
                className={`${styles.statusBadge} ${
                  application.status === 'pending' ? styles.statusPending :
                  application.status === 'approved' ? styles.statusApproved :
                  styles.statusRejected
                }`}
              >
                {getApplicationStatusIcon(application.status)}
                <span>{application.status_display}</span>
              </div>
            </div>
            {application.status === 'rejected' && application.rejection_reason && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 }}>
                <Text type="danger" style={{ fontSize: 14 }}>
                  <strong>Причина отклонения:</strong> {application.rejection_reason}
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyApplicationCard}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Text style={{ fontSize: 16, color: '#6b7280' }}>
                У вас ещё нет анкеты. Заполните анкету для работы на платформе.
              </Text>
              <Button 
                type="primary" 
                size="large"
                className={styles.buttonPrimary}
                onClick={() => setApplicationModalVisible(true)}
                style={{ marginTop: 8 }}
              >
                Заполнить анкету
              </Button>
            </Space>
          </div>
        )}

        {/* Available Orders Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h2 className={styles.sectionTitle}>Доступные заказы</h2>
          </div>
          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              <Text>Нет доступных заказов</Text>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div style={{ flex: 1 }}>
                    <h4 className={styles.orderTitle}>{order.title}</h4>
                    <Text type="secondary" style={{ fontSize: 14 }}>#{order.id}</Text>
                    <div className={styles.orderTags} style={{ marginTop: 12 }}>
                      {order.subject && <span className={styles.tagBlue}>{order.subject.name}</span>}
                      {order.work_type && <span className={styles.tag}>{order.work_type.name}</span>}
                      <span className={styles.tagGreen}>до {dayjs(order.deadline).format('DD.MM.YYYY')}</span>
                      <span className={styles.tag} style={{ 
                        background: `rgba(${getStatusColor(order.status) === 'blue' ? '59, 130, 246' : 
                          getStatusColor(order.status) === 'green' ? '16, 185, 129' : 
                          getStatusColor(order.status) === 'orange' ? '249, 115, 22' : '107, 114, 128'}, 0.1)`,
                        color: getStatusColor(order.status) === 'blue' ? '#3b82f6' :
                          getStatusColor(order.status) === 'green' ? '#10b981' :
                          getStatusColor(order.status) === 'orange' ? '#f97316' : '#6b7280'
                      }}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className={styles.orderBudget}>{order.budget} ₽</p>
                  </div>
                </div>
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{order.description}</Text>
                </div>
                <div className={styles.actionButtons}>
                  <Button
                    type="primary"
                    className={styles.buttonPrimary}
                    onClick={() => takeMutation.mutate(order.id)}
                    loading={takeMutation.isPending}
                  >
                    Взять в работу
                  </Button>
                  <Space>
                    <InputNumber
                      min={1}
                      step={1}
                      precision={0}
                      placeholder="Ваша цена"
                      onChange={(value) => (order as any)._bidAmount = value}
                      style={{ width: 140, borderRadius: 12 }}
                      className={styles.inputField}
                    />
                    <Button
                      className={styles.buttonSecondary}
                      loading={bidLoading[order.id]}
                      onClick={async () => {
                        try {
                          const amount = (order as any)._bidAmount;
                          if (!amount || amount <= 0) {
                            message.error('Укажите корректную сумму');
                            return;
                          }
                          setBidLoading(prev => ({ ...prev, [order.id]: true }));
                          await ordersApi.placeBid(order.id, { amount });
                          message.success('Ставка отправлена');
                          queryClient.invalidateQueries({ queryKey: ['available-orders'] });
                          queryClient.invalidateQueries({ queryKey: ['clientOrders'] });
                        } catch (e: any) {
                          message.error(e?.response?.data?.detail || e?.response?.data?.amount || 'Не удалось отправить ставку');
                        } finally {
                          setBidLoading(prev => ({ ...prev, [order.id]: false }));
                        }
                      }}
                    >
                      Предложить
                    </Button>
                  </Space>
                </div>
                <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                  <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Чат по заказу</strong>
                  <OrderChat orderId={order.id} />
                </div>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* In Progress Orders Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h2 className={styles.sectionTitle}>Мои заказы (в работе)</h2>
          </div>
          {(myInProgress as Order[] | undefined)?.length === 0 ? (
            <div className={styles.emptyState}>
              <Text>Нет заказов в работе</Text>
            </div>
          ) : (
            <div>
              {((myInProgress as Order[] | undefined) || []).map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div style={{ flex: 1 }}>
                    <h4 className={styles.orderTitle}>{order.title}</h4>
                    <Text type="secondary" style={{ fontSize: 14 }}>#{order.id}</Text>
                    <div className={styles.orderTags} style={{ marginTop: 12 }}>
                      {order.subject && <span className={styles.tagBlue}>{order.subject.name}</span>}
                      {order.work_type && <span className={styles.tag}>{order.work_type.name}</span>}
                      <span className={styles.tagGreen}>до {dayjs(order.deadline).format('DD.MM.YYYY')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className={styles.orderBudget}>{order.budget} ₽</p>
                  </div>
                </div>
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{order.description}</Text>
                </div>
                <div className={styles.actionButtons}>
                  <Button
                    type="primary"
                    className={styles.buttonPrimary}
                    onClick={async () => {
                      try {
                        await ordersApi.submitOrder(order.id);
                        message.success('Отправлено на проверку');
                        queryClient.invalidateQueries({ queryKey: ['my-orders-in-progress'] });
                      } catch (e: any) {
                        message.error(e?.response?.data?.detail || 'Не удалось отправить на проверку');
                      }
                    }}
                  >
                    Отправить на проверку
                  </Button>
                  <Upload
                    beforeUpload={async (file) => {
                      try {
                        await ordersApi.uploadOrderFile(order.id, file, { file_type: 'solution' });
                        message.success('Файл загружен');
                        queryClient.invalidateQueries({ queryKey: ['my-orders-in-progress'] });
                      } catch (e: any) {
                        message.error(e?.response?.data?.detail || 'Ошибка загрузки файла');
                      }
                      return false;
                    }}
                    showUploadList={false}
                  >
                    <Button className={styles.buttonSecondary} icon={<UploadOutlined />}>
                      Загрузить файл
                    </Button>
                  </Upload>
                </div>
                <div style={{ marginTop: 20, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                  <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Чат по заказу</strong>
                  <OrderChat orderId={order.id} />
                </div>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h2 className={styles.sectionTitle}>Мои заказы (завершенные)</h2>
          </div>
          {(myCompleted as Order[] | undefined)?.length === 0 ? (
            <div className={styles.emptyState}>
              <Text>Нет завершенных заказов</Text>
            </div>
          ) : (
            <div>
              {((myCompleted as Order[] | undefined) || []).map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div style={{ flex: 1 }}>
                    <h4 className={styles.orderTitle}>{order.title}</h4>
                    <Text type="secondary" style={{ fontSize: 14 }}>#{order.id}</Text>
                    <div className={styles.orderTags} style={{ marginTop: 12 }}>
                      {order.subject && <span className={styles.tagBlue}>{order.subject.name}</span>}
                      {order.work_type && <span className={styles.tag}>{order.work_type.name}</span>}
                      <span className={styles.tagGreen}>до {dayjs(order.deadline).format('DD.MM.YYYY')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className={styles.orderBudget}>{order.budget} ₽</p>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Text style={{ color: '#6b7280', fontSize: 14 }}>{order.description}</Text>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Редактировать профиль
          </div>
        }
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onOk={() => form.submit()}
        width={750}
        okText="Сохранить"
        cancelText="Отмена"
        okButtonProps={{
          className: styles.buttonPrimary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        cancelButtonProps={{
          className: styles.buttonSecondary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        maskStyle={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
        styles={{
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={profile || {}}
          onFinish={async (values) => {
            try {
              await authApi.updateProfile(values);
              message.success('Профиль обновлен');
              setProfileModalVisible(false);
              queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            } catch (e: any) {
              message.error(e?.response?.data?.detail || 'Не удалось обновить профиль');
            }
          }}
        >
          <Form.Item label="Аватар" name="avatar">
            <Upload
              name="avatar"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('Можно загружать только изображения!');
                  return false;
                }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('Размер файла должен быть меньше 2MB!');
                  return false;
                }
                return true;
              }}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const formData = new FormData();
                  formData.append('avatar', file as File);
                  
                  const response = await fetch('http://localhost:8000/api/users/update_me/', {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    },
                    body: formData,
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    form.setFieldsValue({ avatar: result.avatar });
                    onSuccess?.(result);
                    message.success('Аватар обновлен!');
                    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                  } else {
                    throw new Error('Ошибка загрузки');
                  }
                } catch (error) {
                  onError?.(error as Error);
                  message.error('Не удалось загрузить аватар');
                }
              }}
            >
              {profile?.avatar ? (
                <img 
                  src={`http://localhost:8000${profile.avatar}`} 
                  alt="avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div>
                  <UserOutlined />
                  <div style={{ marginTop: 8 }}>Загрузить</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item label="Имя" name="first_name">
            <Input className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Фамилия" name="last_name">
            <Input className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="О себе" name="bio">
            <Input.TextArea rows={4} placeholder="Расскажите о себе, своем опыте и специализации" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Опыт работы (лет)" name="experience_years">
            <AntInputNumber min={0} max={50} style={{ width: '100%' }} className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Почасовая ставка (₽)" name="hourly_rate">
            <AntInputNumber min={0} step={100} style={{ width: '100%' }} className={styles.inputField} size="large" />
          </Form.Item>
          <Form.Item label="Образование" name="education">
            <Input.TextArea rows={3} placeholder="Укажите ваше образование и квалификации" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Навыки" name="skills">
            <Input.TextArea rows={3} placeholder="Перечислите ваши навыки и компетенции" className={styles.textareaField} style={{ fontSize: 15 }} />
          </Form.Item>
          <Form.Item label="Портфолио (ссылка)" name="portfolio_url">
            <Input placeholder="https://example.com/portfolio" className={styles.inputField} size="large" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Expert Application Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Заполнение анкеты эксперта
          </div>
        }
        open={applicationModalVisible}
        onCancel={() => setApplicationModalVisible(false)}
        onOk={() => applicationForm.submit()}
        width={750}
        okText="Отправить"
        cancelText="Отмена"
        okButtonProps={{
          className: styles.buttonPrimary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        cancelButtonProps={{
          className: styles.buttonSecondary,
          size: 'large',
          style: { 
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500
          }
        }}
        maskStyle={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
        styles={{
          content: { 
            borderRadius: 24, 
            padding: 0,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '24px 32px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '24px 24px 0 0'
          },
          body: {
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.95)'
          },
          footer: {
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            borderRadius: '0 0 24px 24px'
          }
        }}
      >
        <Form
          form={applicationForm}
          layout="vertical"
          initialValues={{ educations: [{}] }}
          onFinish={(values) => {
            // Filter out empty education entries
            const educations = values.educations?.filter((edu: Education) => 
              edu.university && edu.start_year
            ) || [];
            
            if (educations.length === 0) {
              message.error('Добавьте хотя бы одно образование');
              return;
            }
            
            createApplicationMutation.mutate({
              ...values,
              educations
            });
          }}
        >
          <Form.Item
            label="ФИО"
            name="full_name"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input 
              placeholder="Иванов Иван Иванович" 
              className={styles.inputField}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Опыт работы (лет)"
            name="work_experience_years"
            rules={[{ required: true, message: 'Укажите опыт работы' }]}
          >
            <AntInputNumber 
              min={0} 
              max={50} 
              style={{ width: '100%' }}
              className={styles.inputField}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Специальности"
            name="specializations"
            rules={[{ required: true, message: 'Введите специальности' }]}
            extra="Укажите специальности, которые вы пишете (можно через запятую или каждую на новой строке)"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Например: Математика, Физика, Информатика или каждую на новой строке"
              className={styles.textareaField}
              style={{ fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item label="Образование">
            <Form.List name="educations">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className={styles.modalEducationRow}>
                      <Row gutter={16}>
                        <Col span={9}>
                          <Form.Item
                            {...restField}
                            name={[name, 'university']}
                            rules={[{ required: true, message: 'Введите ВУЗ' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input 
                              placeholder="Название ВУЗа" 
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'start_year']}
                            rules={[{ required: true, message: 'Год начала' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <AntInputNumber 
                              min={1950} 
                              max={2100} 
                              placeholder="Год начала" 
                              style={{ width: '100%' }}
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'end_year']}
                            style={{ marginBottom: 0 }}
                          >
                            <AntInputNumber 
                              min={1950} 
                              max={2100} 
                              placeholder="Год окончания" 
                              style={{ width: '100%' }}
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'degree']}
                            style={{ marginBottom: 0 }}
                          >
                            <Input 
                              placeholder="Степень" 
                              className={styles.inputField}
                              size="large"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={1}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            style={{ marginTop: 4 }}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      size="large"
                      style={{
                        borderRadius: 12,
                        height: 48,
                        fontSize: 15,
                        fontWeight: 500,
                        borderColor: 'rgba(102, 126, 234, 0.3)',
                        color: '#667eea'
                      }}
                    >
                      Добавить образование
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpertDashboard;

// Простой чат-компонент для заказа (MVP)
const OrderChat: React.FC<{ orderId: number }> = ({ orderId }) => {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['order-comments', orderId],
    queryFn: () => ordersApi.getComments(orderId),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const raw = (data as any) || [];
  const comments: OrderComment[] = Array.isArray(raw) ? raw : Array.isArray(raw.results) ? raw.results : [];

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments?.length]);

  const authorName = (c: OrderComment) => c?.author?.username || (c?.author?.id ? `Пользователь #${c.author.id}` : 'Пользователь');

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginTop: 8 }}>
      <div ref={scrollRef} style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 8 }}>
        {isLoading ? (
          <Spin size="small" />
        ) : comments.length === 0 ? (
          <div style={{ color: '#999', fontStyle: 'italic' }}>Сообщений пока нет</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {authorName(c)} — {dayjs(c.created_at).format('DD.MM HH:mm')}
                </div>
                <div>{c.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="Напишите сообщение"
        />
        <Button
          type="primary"
          disabled={!text.trim() || sending}
          loading={sending}
          onClick={async () => {
            if (!text.trim()) return;
            try {
              setSending(true);
              await ordersApi.addComment(orderId, text.trim());
              setText('');
              await refetch();
            } catch (e: any) {
              message.error(e?.response?.data?.detail || 'Не удалось отправить сообщение');
            } finally {
              setSending(false);
            }
          }}
        >
          Отправить
        </Button>
      </div>
    </div>
  );
};
