import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Typography, Button, message } from 'antd';
import { MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from '../../components/layout/Sidebar';
import Filters from './components/Filters';
import WorksList from './components/WorksList';
import EmptyState from './components/EmptyState';
import { authApi } from '../../api/auth';
import { FiltersState } from './types';
import { mockPurchasedWorks } from './mockData';
import styles from './PurchasedWorks.module.css';

const { Content, Header } = Layout;
const { Title } = Typography;

const PurchasedWorks: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);
  const [filters, setFilters] = useState<FiltersState>({ sortBy: 'date' });

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Используем моковые данные (в будущем заменить на API)
  const works = mockPurchasedWorks;

  // Обработчики навигации
  const handleMenuSelect = (key: string) => {
    // Навигация обрабатывается в Sidebar
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      message.error('Ошибка при выходе');
    }
  };

  const handleDownload = (workId: number) => {
    const work = works.find(w => w.id === workId);
    if (!work || !work.files || work.files.length === 0) return message.error('Файлы не найдены');
    if (work.files.length === 1) {
      const file = work.files[0];
      if (!file.url || file.url === '#') return message.error('Ссылка на файл отсутствует');
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Скачивание начато');
    } else {
      work.files.forEach(file => {
        if (file.url && file.url !== '#') {
          const link = document.createElement('a');
          link.href = file.url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
      message.success('Скачивание всех файлов начато');
    }
  };

  // Фильтрация и сортировка работ
  const filteredWorks = useMemo(() => {
    let result = [...works];

    // Поиск
    if (filters.search) {
      result = result.filter((work) =>
        work.title.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Фильтр по категории
    if (filters.category) {
      result = result.filter((work) => work.category === filters.category);
    }

    // Фильтр по предмету
    if (filters.subject) {
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
      case 'date':
      default:
        result.sort(
          (a, b) =>
            new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        );
        break;
    }

    return result;
  }, [works, filters]);

  return (
    <Layout className={styles.layout}>
      <Sidebar
        selectedKey="shop-purchased"
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
        <Header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                }}
              />
            )}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#1f2937' }}>
              Купленные работы
            </Title>
          </div>
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ borderRadius: '8px' }}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>

        <Content className={styles.content}>
          <div className={styles.contentContainer}>
            {works.length > 0 ? (
              <>
                <Filters filters={filters} onFilterChange={setFilters} />
                <WorksList
                  works={filteredWorks}
                  loading={false}
                  onDownload={handleDownload}
                />
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PurchasedWorks;
