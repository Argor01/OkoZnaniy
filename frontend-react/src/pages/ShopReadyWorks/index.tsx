import React, { useState } from 'react';
import { Layout, Typography, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from '../../components/layout/Sidebar';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import { authApi } from '../../api/auth';
import { Filters as FiltersType, Work } from './types';
import { mockWorks } from './mockData';
import styles from './ShopReadyWorks.module.css';

const { Content, Header } = Layout;
const { Title } = Typography;

const ShopReadyWorks: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FiltersType>({ sortBy: 'newness' });
  const [works, setWorks] = useState<Work[]>(mockWorks);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Обработчики
  const handleMenuSelect = (key: string) => {
    if (key === 'shop-ready-works') {
      // Уже на этой странице
      return;
    }
    if (key === 'shop-add-work') {
      navigate('/shop/add-work');
      return;
    }
    if (key === 'shop-my-works' || key === 'works') {
      navigate('/works');
      return;
    }
    if (key === 'shop-purchased') {
      navigate('/shop/purchased');
      return;
    }
    if (key.startsWith('orders-') || key === 'orders') {
      navigate('/expert');
      return;
    }
    // Другие пункты меню обрабатываются через модальные окна в Sidebar
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      message.error('Ошибка при выходе');
    }
  };

  const handleWorkClick = (id: number) => {
    message.info(`Открыть работу ${id}`);
    // TODO: Открыть модальное окно с деталями работы
  };

  const handleFavorite = (id: number) => {
    setWorks((prevWorks) =>
      prevWorks.map((work) =>
        work.id === id ? { ...work, isFavorite: !work.isFavorite } : work
      )
    );
    message.success('Добавлено в избранное');
  };

  const handlePurchase = (id: number) => {
    message.info(`Купить работу ${id}`);
    // TODO: Открыть модальное окно покупки
  };

  // Фильтрация и сортировка работ
  const filteredWorks = React.useMemo(() => {
    let result = [...works];

    // Поиск
    if (filters.search) {
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          work.description.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Фильтр по категории
    if (filters.category && filters.category !== 'Все категории') {
      result = result.filter((work) => work.category === filters.category);
    }

    // Фильтр по предмету
    if (filters.subject && filters.subject !== 'Все предметы') {
      result = result.filter((work) => work.subject === filters.subject);
    }

    // Сортировка
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        result.sort((a, b) => b.viewsCount - a.viewsCount);
        break;
      case 'newness':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [works, filters]);

  return (
    <Layout className={styles.layout}>
      <Sidebar
        selectedKey="shop-ready-works"
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
        mobileDrawerOpen={mobileMenuVisible}
        onMobileDrawerChange={setMobileMenuVisible}
        userProfile={
          profile
            ? {
                username: profile.username,
                avatar: profile.avatar,
                role: profile.role,
              }
            : undefined
        }
      />

      <Layout className={styles.mainLayout}>
        <Header
          style={{
            background: '#fff',
            padding: isMobile ? '0 16px' : '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{ borderRadius: '8px' }}
              />
            )}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Магазин готовых работ
            </Title>
          </div>
          <Button type="default" danger icon={<LogoutOutlined />} onClick={handleLogout}>
            {!isMobile && 'Выйти'}
          </Button>
        </Header>

        <Content className={styles.content}>
          <Filters filters={filters} onFilterChange={setFilters} />

          <WorksList
            works={filteredWorks}
            loading={false}
            onWorkClick={handleWorkClick}
            onFavorite={handleFavorite}
            onPurchase={handlePurchase}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ShopReadyWorks;
