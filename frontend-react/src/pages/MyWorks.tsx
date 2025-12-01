import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Card, Tag, Empty, Modal, message } from 'antd';
import {
  FileDoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { authApi } from '../api/auth';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [workDetailModalVisible, setWorkDetailModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Выход из системы',
      content: 'Вы уверены, что хотите выйти?',
      okText: 'Выйти',
      cancelText: 'Отмена',
      maskStyle: {
        backdropFilter: 'blur(4px)',
      },
      onOk: async () => {
        try {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/login');
        } catch (error) {
          authApi.logout();
          message.success('Вы вышли из системы');
          navigate('/login');
        }
      },
    });
  };

  const handleMenuSelect = (key: string) => {
    // Обработка выбора меню если нужно
  };

  const menuItems: MenuItem[] = [
    {
      key: 'all',
      icon: <FileDoneOutlined />,
      label: 'Все работы',
    },
    {
      key: 'in_progress',
      icon: <ClockCircleOutlined />,
      label: 'В работе',
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined />,
      label: 'Завершенные',
    },
    {
      key: 'cancelled',
      icon: <CloseCircleOutlined />,
      label: 'Отмененные',
    },
    {
      key: 'shop',
      icon: <ShoppingOutlined />,
      label: 'Магазин работ',
    },
  ];

  // Тестовые данные работ
  const mockWorks = [
    {
      id: 1,
      title: 'Решение задач по высшей математике',
      subject: 'Математика',
      status: 'in_progress',
      deadline: '2024-11-20',
      price: 5000,
      client: 'Иван Петров',
      description: 'Необходимо решить 10 задач по теме "Интегралы и производные"',
    },
    {
      id: 2,
      title: 'Курсовая работа по физике',
      subject: 'Физика',
      status: 'completed',
      deadline: '2024-11-15',
      price: 8000,
      client: 'Мария Сидорова',
      description: 'Курсовая работа на тему "Квантовая механика"',
    },
    {
      id: 3,
      title: 'Лабораторная работа по химии',
      subject: 'Химия',
      status: 'in_progress',
      deadline: '2024-11-18',
      price: 3500,
      client: 'Алексей Смирнов',
      description: 'Выполнение лабораторной работы по органической химии',
    },
    {
      id: 4,
      title: 'Контрольная работа по программированию',
      subject: 'Информатика',
      status: 'completed',
      deadline: '2024-11-10',
      price: 6000,
      client: 'Елена Козлова',
      description: 'Написание программы на Python для обработки данных',
    },
    {
      id: 5,
      title: 'Реферат по истории',
      subject: 'История',
      status: 'cancelled',
      deadline: '2024-11-12',
      price: 2000,
      client: 'Дмитрий Волков',
      description: 'Реферат на тему "Великая Отечественная война"',
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { color: '#1890ff', text: 'В работе', icon: <ClockCircleOutlined /> };
      case 'completed':
        return { color: '#52c41a', text: 'Завершено', icon: <CheckCircleOutlined /> };
      case 'cancelled':
        return { color: '#ff4d4f', text: 'Отменено', icon: <CloseCircleOutlined /> };
      default:
        return { color: '#d9d9d9', text: 'Неизвестно', icon: <FileDoneOutlined /> };
    }
  };

  const filteredWorks = mockWorks.filter((work) => {
    if (selectedMenu === 'all') return true;
    if (selectedMenu === 'shop') return false; // Магазин - отдельная логика
    return work.status === selectedMenu;
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar 
        selectedKey="works"
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
        onMessagesClick={() => message.info('Сообщения')}
        onNotificationsClick={() => message.info('Уведомления')}
        onArbitrationClick={() => message.info('Арбитраж')}
        onFinanceClick={() => message.info('Финансы')}
        onFriendsClick={() => message.info('Мои друзья')}
        onFaqClick={() => message.info('FAQ')}
      />

      <Layout>
        {!isMobile && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              padding: '24px 0',
            }}
          >
            <Title level={4} style={{ padding: '0 24px', marginBottom: 16 }}>
              Фильтры
            </Title>
            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              onClick={({ key }) => setSelectedMenu(key)}
              items={menuItems}
              style={{ border: 'none' }}
            />
          </Sider>
        )}
        <Content style={{ margin: isMobile ? '0' : '24px', padding: isMobile ? '16px' : '24px', background: '#fff', borderRadius: isMobile ? 0 : 8, minHeight: 280 }}>
        {isMobile && (
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ marginBottom: 12 }}>Фильтры</Title>
            <Menu
              mode="horizontal"
              selectedKeys={[selectedMenu]}
              onClick={({ key }) => setSelectedMenu(key)}
              items={menuItems}
              style={{ border: 'none', marginBottom: 16 }}
            />
          </div>
        )}
        {selectedMenu === 'shop' ? (
          <Card>
            <Empty description="Магазин работ в разработке" />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredWorks.length > 0 ? (
              filteredWorks.map((work) => {
                const statusConfig = getStatusConfig(work.status);
                return (
                  <Card
                    key={work.id}
                    hoverable
                    style={{
                      borderRadius: 8,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {work.title}
                          </Title>
                          <Tag color={statusConfig.color} icon={statusConfig.icon}>
                            {statusConfig.text}
                          </Tag>
                        </div>

                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Text type="secondary">
                            <strong>Предмет:</strong> {work.subject}
                          </Text>
                          <Text type="secondary">
                            <strong>Заказчик:</strong> {work.client}
                          </Text>
                          <Text type="secondary">
                            <strong>Срок:</strong> {work.deadline}
                          </Text>
                          <Text>{work.description}</Text>
                        </Space>
                      </div>

                      <div style={{ textAlign: 'right', marginLeft: 24 }}>
                        <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                          {work.price.toLocaleString('ru-RU')} ₽
                        </Title>
                        <Space style={{ marginTop: 16 }}>
                          <Button 
                            type="primary" 
                            size="small"
                            onClick={() => {
                              setSelectedWork(work);
                              setWorkDetailModalVisible(true);
                            }}
                          >
                            Подробнее
                          </Button>
                          {work.status === 'in_progress' && (
                            <Button size="small">Завершить</Button>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card>
                <Empty description="Нет работ в этой категории" />
              </Card>
            )}
          </div>
        )}
        </Content>

        {/* Правый сайдбар с фильтрами */}
      <Sider
        width={250}
        style={{
          background: '#fff',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            padding: '24px 16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Фильтры
          </Title>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => setSelectedMenu(key)}
          style={{ border: 'none', marginTop: 16 }}
          items={menuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
        </Sider>
      </Layout>

      {/* Work Detail Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            color: '#1890ff'
          }}>
            Детали работы
          </div>
        }
        open={workDetailModalVisible}
        onCancel={() => setWorkDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setWorkDetailModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="message" 
            type="primary" 
            icon={<MessageOutlined />}
            onClick={() => {
              setWorkDetailModalVisible(false);
              navigate('/expert', { state: { openChat: selectedWork?.client?.username || 'Заказчик' } });
            }}
          >
            Написать заказчику
          </Button>
        ]}
        width={800}
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
        {selectedWork && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4} style={{ marginBottom: 8 }}>{selectedWork.title}</Title>
              <Tag 
                icon={
                  selectedWork.status === 'in_progress' ? <ClockCircleOutlined /> :
                  selectedWork.status === 'completed' ? <CheckCircleOutlined /> :
                  <CloseCircleOutlined />
                }
                color={
                  selectedWork.status === 'in_progress' ? 'blue' :
                  selectedWork.status === 'completed' ? 'green' :
                  'red'
                }
              >
                {selectedWork.status === 'in_progress' ? 'В работе' :
                 selectedWork.status === 'completed' ? 'Завершено' :
                 'Отменено'}
              </Tag>
            </div>

            <div>
              <Text strong>Предмет:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{selectedWork.subject}</Text>
              </div>
            </div>

            <div>
              <Text strong>Заказчик:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{selectedWork.client}</Text>
              </div>
            </div>

            <div>
              <Text strong>Срок выполнения:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{selectedWork.deadline}</Text>
              </div>
            </div>

            <div>
              <Text strong>Бюджет:</Text>
              <div style={{ marginTop: 8 }}>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {selectedWork.price.toLocaleString('ru-RU')} ₽
                </Title>
              </div>
            </div>

            <div>
              <Text strong>Описание:</Text>
              <div style={{ marginTop: 8, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <Text>{selectedWork.description}</Text>
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </Layout>
  );
};

export default MyWorks;
