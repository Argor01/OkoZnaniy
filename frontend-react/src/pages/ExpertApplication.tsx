import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, Typography, message, Alert, Tag, Descriptions, Modal } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ExpertApplication: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

  // Проверяем статус пользователя при загрузке
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
        
        // Если анкета уже подана, заполняем форму
        if (user.has_submitted_application) {
          form.setFieldsValue({
            first_name: user.first_name,
            last_name: user.last_name,
            bio: user.bio,
            experience_years: user.experience_years,
            education: user.education,
            skills: user.skills,
            portfolio_url: user.portfolio_url,
          });
        }
      } catch (error) {
        message.error('Не удалось загрузить данные пользователя');
        navigate('/login');
      }
    };
    
    checkUserStatus();
  }, [navigate, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const updatedUser = await authApi.submitExpertApplication(values);
      // Обновляем данные пользователя
      setCurrentUser(updatedUser);
      // Показываем модальное окно с приветствием
      setWelcomeModalVisible(true);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.error ||
                          'Не удалось подать анкету';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateEducation = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Укажите ваше образование'));
    }
    if (value.length < 10) {
      return Promise.reject(new Error('Опишите ваше образование подробнее'));
    }
    return Promise.resolve();
  };

  const validateBio = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Расскажите о себе'));
    }
    if (value.length < 30) {
      return Promise.reject(new Error('Расскажите о себе подробнее (минимум 30 символов)'));
    }
    return Promise.resolve();
  };

  const getStatusTag = () => {
    if (!currentUser?.has_submitted_application) {
      return null;
    }
    
    if (currentUser?.application_approved) {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 16, padding: '8px 16px' }}>
          Одобрено
        </Tag>
      );
    } else {
      return (
        <Tag icon={<ClockCircleOutlined />} color="warning" style={{ fontSize: 16, padding: '8px 16px' }}>
          В рассмотрении
        </Tag>
      );
    }
  };

  if (!currentUser || currentUser.role !== 'expert') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Alert message="Доступ запрещен" description="Эта страница доступна только для экспертов" type="error" />
      </div>
    );
  }

  const hasSubmitted = currentUser?.has_submitted_application;
  const isApproved = currentUser?.application_approved;

  return (
    <div style={{ 
      position: 'relative',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-brand-blue-600) 0%, #b9e0ff 100%)',
      paddingTop: '150px',
      paddingBottom: '100px'
    }}>
      {/* Декоративные элементы */}
      <div style={{
        position: 'absolute',
        top: 50,
        left: '10%',
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        top: 200,
        right: '15%',
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(155, 74, 255, 0.2)',
        zIndex: 0
      }}></div>

      <div className="mcontainer" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ 
          maxWidth: 800, 
          margin: '0 auto',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-card)',
          background: '#fff',
          overflow: 'hidden'
        }}>
          {/* Заголовок с градиентом */}
          <div style={{
            background: 'linear-gradient(146deg, var(--color-brand-blue-500) 0%, #97d0ff 100%)',
            padding: '60px 40px 40px',
            textAlign: 'center'
          }}>
            <FileTextOutlined style={{ fontSize: 64, color: '#fff', marginBottom: 16 }} />
            <Title level={1} style={{ 
              margin: 0, 
              marginBottom: 12,
              fontFamily: 'var(--font-family-display)',
              fontWeight: 800,
              color: '#fff'
            }}>
              Анкета эксперта
            </Title>
            {getStatusTag()}
            <Paragraph style={{ marginTop: 16, fontSize: 18, color: 'rgba(255, 255, 255, 0.9)' }}>
              {hasSubmitted 
                ? 'Просмотр данных вашей анкеты' 
                : 'Заполните анкету для участия в платформе. После проверки вашей анкеты мы уведомим вас о результате.'}
            </Paragraph>
          </div>

          {/* Содержимое карточки */}
          <div style={{ padding: '40px' }}>
            {/* Статус анкеты */}
            {hasSubmitted && (
              <Alert
                message="Анкета подана"
                description={
                  <Descriptions column={1} bordered size="small" style={{ marginTop: 8 }}>
                    <Descriptions.Item label="Дата подачи">
                      {currentUser.application_submitted_at 
                        ? dayjs(currentUser.application_submitted_at).format('DD.MM.YYYY HH:mm')
                        : '—'}
                    </Descriptions.Item>
                    {currentUser.application_reviewed_at && (
                      <Descriptions.Item label="Дата рассмотрения">
                        {dayjs(currentUser.application_reviewed_at).format('DD.MM.YYYY HH:mm')}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Статус">
                      {isApproved ? 'Одобрено' : 'В рассмотрении'}
                    </Descriptions.Item>
                  </Descriptions>
                }
                type={isApproved ? "success" : "warning"}
                showIcon
                style={{ 
                  marginBottom: 32,
                  borderRadius: '10px'
                }}
              />
            )}

            {isApproved && (
              <Alert
                message="Анкета одобрена"
                description="Ваша анкета была одобрена. Вы можете просматривать и выполнять заказы."
                type="success"
                showIcon
                style={{ 
                  marginBottom: 32,
                  borderRadius: '10px'
                }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={currentUser}
              style={{ fontFamily: 'var(--font-family-sans)' }}
            >
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: 20
              }}>
                <Form.Item
                  name="first_name"
                  label={<span style={{ fontWeight: 600 }}>Имя</span>}
                  rules={[{ required: true, message: 'Введите ваше имя' }]}
                >
                  <Input 
                    placeholder="Введите ваше имя" 
                    size="large"
                    disabled={hasSubmitted}
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>

                <Form.Item
                  name="last_name"
                  label={<span style={{ fontWeight: 600 }}>Фамилия</span>}
                  rules={[{ required: true, message: 'Введите вашу фамилию' }]}
                >
                  <Input 
                    placeholder="Введите вашу фамилию" 
                    size="large"
                    disabled={hasSubmitted}
                    style={{ borderRadius: '8px' }}
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="experience_years"
                label={<span style={{ fontWeight: 600 }}>Опыт работы (лет)</span>}
                rules={[
                  { required: true, message: 'Укажите ваш опыт работы' },
                  { type: 'number', min: 0, message: 'Опыт не может быть отрицательным' }
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="Укажите ваш опыт работы в годах" 
                  size="large"
                  disabled={hasSubmitted}
                  min={0}
                  max={50}
                  precision={0}
                  controls={false}
                  keyboard={true}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                name="bio"
                label={<span style={{ fontWeight: 600 }}>О себе</span>}
                rules={[{ validator: validateBio }]}
                extra={<span style={{ color: '#666' }}>Расскажите о себе: ваш опыт, специальности, области экспертизы</span>}
              >
                <TextArea 
                  rows={6} 
                  placeholder="Опишите ваш профессиональный опыт и специализацию..."
                  disabled={hasSubmitted}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="education"
                label={<span style={{ fontWeight: 600 }}>Образование</span>}
                rules={[{ validator: validateEducation }]}
                extra={<span style={{ color: '#666' }}>Укажите ваше образование: вуз, специальность, годы обучения. Если у вас несколько образований, перечислите их все.</span>}
              >
                <TextArea 
                  rows={5} 
                  placeholder="Например: МГУ, факультет ВМиК, специальность 'Прикладная математика и информатика', 2015-2019..."
                  disabled={hasSubmitted}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="skills"
                label={<span style={{ fontWeight: 600 }}>Навыки</span>}
                extra={<span style={{ color: '#666' }}>Перечислите ваши навыки и компетенции</span>}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Например: Python, Django, математический анализ, статистика..."
                  disabled={hasSubmitted}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="portfolio_url"
                label={<span style={{ fontWeight: 600 }}>Портфолио (ссылка)</span>}
                extra={<span style={{ color: '#666' }}>Если у вас есть портфолио, поделитесь ссылкой</span>}
              >
                <Input 
                  placeholder="https://example.com/portfolio" 
                  size="large"
                  disabled={hasSubmitted}
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              {!hasSubmitted && (
                <>
                  <Alert
                    message="Внимание"
                    description="После подачи анкеты вы не сможете редактировать её. Убедитесь, что все данные указаны корректно."
                    type="warning"
                    showIcon
                    style={{ 
                      marginBottom: 24,
                      borderRadius: '10px'
                    }}
                  />

                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      size="large"
                      block
                      style={{ 
                        height: 60,
                        borderRadius: '10px',
                        fontSize: 18,
                        fontWeight: 600,
                        background: 'var(--color-brand-orange-500)',
                        border: 'none'
                      }}
                    >
                      Отправить анкету
                    </Button>
                  </Form.Item>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate('/expert')}
                  style={{ 
                    fontSize: 16,
                    color: 'var(--color-brand-blue-600)'
                  }}
                >
                  Вернуться к кабинету эксперта
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>

      {/* Модальное окно приветствия после регистрации */}
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
            Регистрация прошла успешно!
          </div>
        }
        open={welcomeModalVisible}
        onCancel={() => {
          setWelcomeModalVisible(false);
          // Обновляем данные пользователя после закрытия модального окна
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }}
        footer={[
          <Button
            key="submit"
            type="primary"
            size="large"
            onClick={() => {
              setWelcomeModalVisible(false);
              // Обновляем данные пользователя после закрытия модального окна
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }}
            style={{
              borderRadius: 12,
              height: 44,
              fontSize: 16,
              fontWeight: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            Понятно
          </Button>
        ]}
        width={700}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          },
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
        <div style={{ lineHeight: 1.8, fontSize: 15, color: '#333' }}>
          <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 500 }}>
            Добро пожаловать на сервис помощи студентам,
          </Paragraph>
          
          <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 600, color: '#667eea' }}>
            {currentUser?.username || currentUser?.email || 'Пользователь'}!
          </Paragraph>

          <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
            Для того, чтобы заказчики размещали больше заказов по вашему профилю и выбирали именно Вас, Вам необходимо заполнить в профиле следующую информацию:
          </Paragraph>

          <div style={{ marginLeft: 20, marginBottom: 20 }}>
            <Paragraph style={{ marginBottom: 12 }}>
              <strong>1.</strong> Специализации, с которыми Вы можете помочь заказчикам.
            </Paragraph>
            <Paragraph style={{ marginBottom: 12 }}>
              <strong>2.</strong> Описание профиля – здесь можете указать любую информацию о себе: образование, опыт работы, типы работ с которыми помогаете, график работы и другую индивидуальную информацию о себе
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <strong>3.</strong> Загрузите оригинальную аватарку – чтобы выделяться на фоне остальных исполнителей
            </Paragraph>
          </div>

          <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
            Для комфортной работы, Вы можете ознакомиться с нашим разделом <strong>FAQ</strong>. По всем вопросам, касающихся работы сервиса, можете обращаться к нашему администратору <strong>Admin</strong>
          </Paragraph>

          <Paragraph style={{ fontSize: 15, marginTop: 20, fontWeight: 600, color: '#667eea', textAlign: 'center' }}>
            Желаем легких заказов и высоких доходов!
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
};

export default ExpertApplication;
