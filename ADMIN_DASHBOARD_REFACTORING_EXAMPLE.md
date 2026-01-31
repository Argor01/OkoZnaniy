# Пример рефакторинга AdminDashboard - Этап 1-2

## 🎯 Демонстрация первых этапов рефакторинга

### Этап 1: Создание структуры

```bash
# Создаем папки для новой модульной структуры
mkdir -p frontend-react/src/pages/AdminDashboard/{components,hooks,types,utils,constants}
mkdir -p frontend-react/src/pages/AdminDashboard/components/{Layout,Sections,Tables,Modals,Statistics}
mkdir -p frontend-react/src/pages/AdminDashboard/components/Sections/Claims

# ВАЖНО: Старый файл AdminDashboard.tsx остается на месте!
# Он будет служить резервной копией
```

### Этап 2: Вынос типов

**frontend-react/src/pages/AdminDashboard/types/admin.types.ts**
```typescript
import { User } from '../../../api/auth';

export interface Partner {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  referral_code: string;
  partner_commission_rate: number;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  is_verified: boolean;
  date_joined: string;
}

export interface PartnerEarning {
  id: number;
  partner: string;
  referral: string;
  amount: number;
  earning_type: 'order' | 'registration' | 'bonus';
  is_paid: boolean;
  created_at: string;
}

export interface Dispute {
  id: number;
  order: {
    id: number;
    title: string;
    client: User;
    expert: User | null;
  };
  reason: string;
  arbitrator: User | null;
  resolved: boolean;
  result?: string;
  created_at: string;
}

export interface Arbitrator {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UpdatePartnerRequest {
  partner_commission_rate?: number;
  is_verified?: boolean;
}

export interface AdminStats {
  totalPartners: number;
  totalReferrals: number;
  totalEarnings: number;
  unpaidEarnings: number;
  totalDisputes: number;
  resolvedDisputes: number;
  pendingDisputes: number;
}

export type MenuKey = 
  | 'overview'
  | 'partners' 
  | 'earnings'
  | 'disputes'
  | 'new_claims'
  | 'in_progress_claims'
  | 'completed_claims'
  | 'pending_approval'
  | 'claims_processing'
  | 'communication';
```

**frontend-react/src/pages/AdminDashboard/constants/menuItems.ts**
```typescript
import {
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  MessageOutlined,
} from '@ant-design/icons';

export const menuItems = [
  {
    key: 'overview',
    icon: BarChartOutlined,
    label: 'Обзор',
  },
  {
    key: 'partners',
    icon: TeamOutlined,
    label: 'Партнеры',
  },
  {
    key: 'earnings',
    icon: DollarOutlined,
    label: 'Начисления',
  },
  {
    key: 'disputes',
    icon: FileTextOutlined,
    label: 'Споры',
  },
  {
    key: 'claims',
    icon: FileTextOutlined,
    label: 'Обращения',
    children: [
      {
        key: 'new_claims',
        icon: BellOutlined,
        label: 'Новые обращения',
      },
      {
        key: 'in_progress_claims',
        icon: ClockCircleOutlined,
        label: 'В работе',
      },
      {
        key: 'completed_claims',
        icon: CheckCircleOutlined,
        label: 'Завершённые',
      },
      {
        key: 'pending_approval',
        icon: HourglassOutlined,
        label: 'Ожидают решения',
      },
    ],
  },
  {
    key: 'claims_processing',
    icon: FileTextOutlined,
    label: 'Обработка претензий',
  },
  {
    key: 'communication',
    icon: MessageOutlined,
    label: 'Коммуникация с дирекцией',
  },
];

export const titleMap: Record<string, string> = {
  overview: 'Обзор',
  partners: 'Партнеры',
  earnings: 'Начисления',
  disputes: 'Споры',
  new_claims: 'Новые обращения',
  in_progress_claims: 'В работе',
  completed_claims: 'Завершённые',
  pending_approval: 'Ожидают решения',
  claims_processing: 'Обработка претензий',
  communication: 'Коммуникация с дирекцией',
};
```

### Этап 3: Создание хука аутентификации

**frontend-react/src/pages/AdminDashboard/hooks/useAdminAuth.ts**
```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authApi, type User } from '../../../api/auth';

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hasToken = !!localStorage.getItem('access_token');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setLoading(false);
  };

  const handleLogout = () => {
    try {
      authApi.logout();
      setUser(null);
      setLoading(false);
      message.success('Вы вышли из системы');
    } catch (error) {
      authApi.logout();
      setUser(null);
      setLoading(false);
      message.success('Вы вышли из системы');
    }
  };

  // Проверяем права доступа
  const canLoadData = hasToken && !!user && user.role === 'admin';
  
  // Проверяем, является ли пользователь директором
  const isDirector = user?.role === 'admin' && user?.email === 'director@test.com';

  return {
    user,
    loading,
    hasToken,
    canLoadData,
    isDirector,
    checkAuth,
    handleLoginSuccess,
    handleLogout,
  };
};
```

### Этап 4: Создание хука для данных

**frontend-react/src/pages/AdminDashboard/hooks/useAdminData.ts**
```typescript
import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { adminApi } from '../../../api/admin';
import { disputesApi } from '../../../api/disputes';
import type { Partner, PartnerEarning, Dispute, Arbitrator } from '../types/admin.types';

export const useAdminData = (canLoadData: boolean) => {
  // Партнеры
  const partnersQuery = useQuery({
    queryKey: ['admin-partners'],
    queryFn: adminApi.getPartners,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching partners:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных партнеров');
      }
    },
  });

  // Начисления
  const earningsQuery = useQuery({
    queryKey: ['admin-earnings'],
    queryFn: adminApi.getEarnings,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching earnings:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных начислений');
      }
    },
  });

  // Споры
  const disputesQuery = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: disputesApi.getDisputes,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      if (data?.data?.results && Array.isArray(data.data.results)) {
        return data.data.results;
      }
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching disputes:', error);
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        message.warning('Не удалось загрузить данные о спорах');
      }
    },
  });

  // Арбитры
  const arbitratorsQuery = useQuery<Arbitrator[]>({
    queryKey: ['admin-arbitrators'],
    queryFn: adminApi.getArbitrators,
    enabled: canLoadData,
    retry: false,
    retryOnMount: false,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching arbitrators:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных арбитров');
      }
    },
  });

  return {
    partners: partnersQuery.data || [],
    partnersLoading: partnersQuery.isLoading,
    partnersError: partnersQuery.error,
    
    earnings: earningsQuery.data || [],
    earningsLoading: earningsQuery.isLoading,
    earningsError: earningsQuery.error,
    
    disputes: disputesQuery.data || [],
    disputesLoading: disputesQuery.isLoading,
    disputesError: disputesQuery.error,
    
    arbitrators: arbitratorsQuery.data || [],
    arbitratorsLoading: arbitratorsQuery.isLoading,
    arbitratorsError: arbitratorsQuery.error,
  };
};
```

### Этап 5: Пример компонента статистики

**frontend-react/src/pages/AdminDashboard/components/Statistics/StatisticsCards.tsx**
```typescript
import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { AdminStats } from '../../types/admin.types';
import styles from './StatisticsCards.module.css';

interface StatisticsCardsProps {
  stats: AdminStats;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ stats }) => {
  return (
    <div className={styles.statisticsContainer}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Всего партнеров"
              value={stats.totalPartners}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Всего рефералов"
              value={stats.totalReferrals}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Невыплаченные"
              value={stats.unpaidEarnings}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="Всего споров"
              value={stats.totalDisputes}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="Решено"
              value={stats.resolvedDisputes}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card>
            <Statistic
              title="В рассмотрении"
              value={stats.pendingDisputes}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

**frontend-react/src/pages/AdminDashboard/components/Statistics/StatisticsCards.module.css**
```css
.statisticsContainer {
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .statisticsContainer {
    margin-bottom: 16px;
  }
}
```

### Этап 6: Пример новой структуры главного компонента

**frontend-react/src/pages/AdminDashboard/index.tsx**
```typescript
import React, { useState } from 'react';
import { Layout, Spin, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useAdminData } from './hooks/useAdminData';
import { AdminLayout } from './components/Layout/AdminLayout';
import { OverviewSection } from './components/Sections/OverviewSection';
import { PartnersSection } from './components/Sections/PartnersSection';
import AdminLogin from '../../components/admin/AdminLogin';
import type { MenuKey } from './types/admin.types';

const { Content } = Layout;

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('overview');
  
  const {
    user,
    loading,
    hasToken,
    canLoadData,
    isDirector,
    handleLoginSuccess,
    handleLogout,
  } = useAdminAuth();

  const adminData = useAdminData(canLoadData);

  // Показываем спиннер во время загрузки
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  // Показываем форму входа если не авторизован
  if (!hasToken || !user) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  // Перенаправляем директора
  if (isDirector) {
    navigate('/director');
    return null;
  }

  // Проверяем права доступа
  if (user.role !== 'admin') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Result
            status="403"
            title="Доступ запрещен"
            subTitle="У вас нет прав для доступа к личному кабинету администратора."
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                Вернуться на главную
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  // Рендерим соответствующую секцию
  const renderSection = () => {
    switch (selectedMenu) {
      case 'overview':
        return <OverviewSection {...adminData} />;
      case 'partners':
        return <PartnersSection {...adminData} />;
      // ... другие секции
      default:
        return <OverviewSection {...adminData} />;
    }
  };

  return (
    <AdminLayout
      user={user}
      selectedMenu={selectedMenu}
      onMenuSelect={setSelectedMenu}
      onLogout={handleLogout}
    >
      {renderSection()}
    </AdminLayout>
  );
};

export default AdminDashboard;
```

## 🎯 Результат первых этапов

После выполнения первых этапов:

1. **Структура создана** - четкая организация файлов
2. **Типы вынесены** - переиспользуемые TypeScript типы
3. **Хуки созданы** - логика разделена по ответственности
4. **Компоненты начали выделяться** - первые переиспользуемые части
5. **Старый файл сохранен** - AdminDashboard.tsx остается как резерв

## 📈 Прогресс
- ✅ Этап 1: Структура папок
- ✅ Этап 2: Типы и константы  
- ✅ Этап 3: Хуки аутентификации и данных
- ✅ Этап 4: Компонент статистики
- ✅ Этап 5: Новая структура главного компонента
- 🔄 Следующие этапы: Лейаут, секции, таблицы...

## ⚠️ ВАЖНО: Безопасность рефакторинга

```
frontend-react/src/pages/
├── AdminDashboard.tsx          # СТАРЫЙ ФАЙЛ - остается как резерв!
└── AdminDashboard/
    ├── index.tsx               # НОВЫЙ главный компонент
    ├── hooks/                  # Модульные хуки
    ├── components/             # Переиспользуемые компоненты
    └── types/                  # TypeScript типы
```

Это демонстрирует как постепенно разбивать монолитный компонент на модульную архитектуру **БЕЗ ПОТЕРИ** оригинального кода.