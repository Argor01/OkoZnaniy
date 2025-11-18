import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Card, Tag, Empty, message, Modal } from 'antd';
import {
  FileDoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  TrophyOutlined,
  WalletOutlined,
  ShopOutlined,
  TeamOutlined,
  HeartOutlined,
  GiftOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
  const [selectedMenuKey, setSelectedMenuKey] = useState<string>('works');
  const [openKeys, setOpenKeys] = useState<string[]>([]);

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
      {/* Левый сайдбар */}
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
          selectedKeys={[selectedMenuKey]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          triggerSubMenuAction="hover"
          onClick={({ key }) => {
            if (key === 'messages') {
              message.info('Сообщения');
              return;
            }
            if (key === 'notifications') {
              message.info('Уведомления');
              return;
            }
            if (key === 'arbitration') {
              message.info('Арбитраж');
              return;
            }
            if (key === 'balance') {
              message.info('Финансы');
              return;
            }
            if (key.startsWith('orders-') || key === 'orders') {
              navigate('/expert-dashboard');
              return;
            }
            if (key === 'works') {
              // Уже на этой странице
              return;
            }
            if (key === 'shop-ready-works') {
              navigate('/shop/ready-works');
              return;
            }
            if (key === 'shop-add-work') {
              navigate('/shop/add-work');
              return;
            }
            if (key === 'shop-my-works') {
              // Уже на этой странице
              return;
            }
            if (key === 'shop-purchased') {
              navigate('/shop/purchased');
              return;
            }
            if (key === 'friends') {
              message.info('Мои друзья');
              return;
            }
            if (key === 'favorites') {
              message.info('Избранное');
              return;
            }
            if (key === 'bonuses') {
              message.info('Бонусы');
              return;
            }
            if (key === 'paid-services') {
              message.info('Платные услуги');
              return;
            }
            if (key === 'faq') {
              message.info('FAQ');
              return;
            }
            if (key === 'logout') {
              handleLogout();
              return;
            }
            setSelectedMenuKey(key);
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
            У вас нет уведомлений
          </Menu.Item>
          <Menu.Item key="arbitration" icon={<TrophyOutlined />}>
            Арбитраж
          </Menu.Item>
          <Menu.Item key="balance" icon={<WalletOutlined />}>
            Счет: 0.00 ₽
          </Menu.Item>
          <Menu.SubMenu key="orders" icon={<ShoppingOutlined />} title="Мои заказы">
            <Menu.Item key="orders-all">Все (0)</Menu.Item>
            <Menu.Item key="orders-open">Открыт ()</Menu.Item>
            <Menu.Item key="orders-confirming">На подтверждении ()</Menu.Item>
            <Menu.Item key="orders-progress">На выполнении ()</Menu.Item>
            <Menu.Item key="orders-payment">Ожидает оплаты ()</Menu.Item>
            <Menu.Item key="orders-review">На проверке ()</Menu.Item>
            <Menu.Item key="orders-completed">Выполнен ()</Menu.Item>
            <Menu.Item key="orders-revision">На доработке ()</Menu.Item>
            <Menu.Item key="orders-download">Ожидает скачивания ()</Menu.Item>
            <Menu.Item key="orders-closed">Закрыт ()</Menu.Item>
          </Menu.SubMenu>
          <Menu.Item key="works" icon={<FileDoneOutlined />}>
            Мои работы
          </Menu.Item>
          <Menu.SubMenu key="shop" icon={<ShopOutlined />} title="Авторский магазин">
            <Menu.Item key="shop-ready-works">
              Магазин готовых работ
            </Menu.Item>
            <Menu.Item key="shop-add-work">
              Добавить работу в магазин
            </Menu.Item>
            <Menu.Item key="shop-my-works">
              Мои работы
            </Menu.Item>
            <Menu.Item key="shop-purchased">
              Купленные работы
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.Item key="friends" icon={<TeamOutlined />}>
            Мои друзья
          </Menu.Item>
          <Menu.Item key="favorites" icon={<HeartOutlined />}>
            Избранное
          </Menu.Item>
          <Menu.Item key="bonuses" icon={<GiftOutlined />}>
            Бонусы
          </Menu.Item>
          <Menu.Item key="paid-services" icon={<DollarOutlined />}>
            Платные услуги
          </Menu.Item>
          <Menu.Item key="faq" icon={<QuestionCircleOutlined />}>
            FAQ
          </Menu.Item>
          <Menu.Item 
            key="logout" 
            icon={<LogoutOutlined />}
            danger
          >
            Выйти
          </Menu.Item>
        </Menu>
      </Sider>

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
  );
};

export default MyWorks;
