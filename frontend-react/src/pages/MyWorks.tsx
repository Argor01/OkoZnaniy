import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, message, Modal, Card, Tag, Empty } from 'antd';
import {
  FileDoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  TrophyOutlined,
  WalletOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

type MenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
};

const MyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [arbitrationModalVisible, setArbitrationModalVisible] = useState(false);
  const [financeModalVisible, setFinanceModalVisible] = useState(false);

  // Тестовые финансовые данные
  const mockFinanceData = {
    balance: 45750,
    totalEarned: 234500,
    pendingPayments: 12000,
    transactions: [
      {
        id: 1,
        type: 'income',
        amount: 5000,
        description: 'Оплата за заказ "Решение задач по математике"',
        date: '2024-11-15',
        status: 'completed'
      },
      {
        id: 2,
        type: 'income',
        amount: 8000,
        description: 'Оплата за заказ "Курсовая работа по физике"',
        date: '2024-11-14',
        status: 'completed'
      },
      {
        id: 3,
        type: 'withdrawal',
        amount: -15000,
        description: 'Вывод средств на карту',
        date: '2024-11-12',
        status: 'completed'
      },
      {
        id: 4,
        type: 'income',
        amount: 6000,
        description: 'Оплата за заказ "Контрольная работа по программированию"',
        date: '2024-11-10',
        status: 'completed'
      },
      {
        id: 5,
        type: 'pending',
        amount: 12000,
        description: 'Ожидает оплаты: "Дипломная работа"',
        date: '2024-11-16',
        status: 'pending'
      }
    ]
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
      {/* Левый базовый сайдбар */}
      <Sider
        width={250}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <UserOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
          <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
            Личный кабинет эксперта
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={['works']}
          onClick={({ key }) => {
            if (key === 'dashboard') {
              navigate('/expert-dashboard');
              return;
            }
            if (key === 'messages') {
              setMessageModalVisible(true);
              return;
            }
            if (key === 'notifications') {
              setNotificationsModalVisible(true);
              return;
            }
            if (key === 'arbitration') {
              setArbitrationModalVisible(true);
              return;
            }
            if (key === 'balance') {
              setFinanceModalVisible(true);
              return;
            }
            if (key === 'orders') {
              navigate('/expert-dashboard');
              return;
            }
            if (key === 'works') {
              // Уже на этой странице
              return;
            }
            if (key === 'shop') {
              navigate('/shop/ready-works');
              return;
            }
            if (key === 'logout') {
              handleLogout();
              return;
            }
          }}
          style={{
            borderRight: 0,
            height: 'calc(100vh - 120px)',
          }}
        >
          <Menu.Item key="messages" icon={<MessageOutlined />}>
            Сообщения
          </Menu.Item>
          <Menu.Item key="notifications" icon={<BellOutlined />}>
            Уведомления
          </Menu.Item>
          <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
            Арбитраж
          </Menu.Item>
          <Menu.Item key="balance" icon={<WalletOutlined />}>
            Счет: 0.00 ₽
          </Menu.Item>
          <Menu.Item key="orders" icon={<ShoppingOutlined />}>
            Мои заказы
          </Menu.Item>
          <Menu.Item key="works" icon={<FileDoneOutlined />}>
            Мои работы
          </Menu.Item>
          <Menu.Item key="shop" icon={<ShopOutlined />}>
            Авторский магазин
          </Menu.Item>
          <Menu.Item key="logout" icon={<LogoutOutlined />} danger>
            Выйти
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            Мои работы
          </Title>

          <Space>
            <Button icon={<SearchOutlined />}>Поиск</Button>
            <Button type="primary" icon={<PlusOutlined />}>
              Добавить работу
            </Button>
          </Space>
        </Header>

        <Layout>
          <Content style={{ margin: '24px', minHeight: 280 }}>
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
                            <Button type="primary" size="small">
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
      </Layout>

      {/* Модальные окна - заглушки */}
      <Modal
        title="Сообщения"
        open={messageModalVisible}
        onCancel={() => setMessageModalVisible(false)}
        footer={null}
        width={800}
      >
        <Empty description="Функционал сообщений в разработке" />
      </Modal>

      <Modal
        title="Уведомления"
        open={notificationsModalVisible}
        onCancel={() => setNotificationsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Empty description="Нет новых уведомлений" />
      </Modal>

      <Modal
        title="Арбитраж"
        open={arbitrationModalVisible}
        onCancel={() => setArbitrationModalVisible(false)}
        footer={null}
        width={800}
      >
        <Empty description="У вас нет активных арбитражей" />
      </Modal>

      <Modal
        title="Финансы"
        open={financeModalVisible}
        onCancel={() => setFinanceModalVisible(false)}
        footer={null}
        width={900}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Карточки со статистикой */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
              <Space direction="vertical" size="small">
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Текущий баланс</Text>
                <Title level={2} style={{ margin: 0, color: '#fff' }}>
                  {mockFinanceData.balance.toLocaleString('ru-RU')} ₽
                </Title>
              </Space>
            </Card>

            <Card style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none' }}>
              <Space direction="vertical" size="small">
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Всего заработано</Text>
                <Title level={2} style={{ margin: 0, color: '#fff' }}>
                  {mockFinanceData.totalEarned.toLocaleString('ru-RU')} ₽
                </Title>
              </Space>
            </Card>

            <Card style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: 'none' }}>
              <Space direction="vertical" size="small">
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Ожидает оплаты</Text>
                <Title level={2} style={{ margin: 0, color: '#fff' }}>
                  {mockFinanceData.pendingPayments.toLocaleString('ru-RU')} ₽
                </Title>
              </Space>
            </Card>
          </div>

          {/* Кнопка вывода средств */}
          <Button type="primary" size="large" icon={<WalletOutlined />} block>
            Вывести средства
          </Button>

          {/* История транзакций */}
          <Card title="История транзакций" style={{ marginTop: 8 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {mockFinanceData.transactions.map((transaction) => {
                const isIncome = transaction.type === 'income';
                const isPending = transaction.type === 'pending';
                const isWithdrawal = transaction.type === 'withdrawal';

                return (
                  <div
                    key={transaction.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: isPending ? '#fff7e6' : '#fafafa',
                      borderRadius: 8,
                      border: `1px solid ${isPending ? '#ffd591' : '#f0f0f0'}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>
                        {transaction.description}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {transaction.date}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          color: isWithdrawal ? '#ff4d4f' : isIncome ? '#52c41a' : '#faad14',
                        }}
                      >
                        {isWithdrawal ? '' : '+'}{transaction.amount.toLocaleString('ru-RU')} ₽
                      </Title>
                      <Tag
                        color={isPending ? 'orange' : isWithdrawal ? 'red' : 'green'}
                        style={{ marginTop: 4 }}
                      >
                        {isPending ? 'Ожидает' : transaction.status === 'completed' ? 'Завершено' : 'В обработке'}
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </Space>
          </Card>
        </Space>
      </Modal>
    </Layout>
  );
};

export default MyWorks;
