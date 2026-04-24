import React, { useState, Suspense } from 'react';
import { Layout } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { authApi } from '@/features/auth/api/auth';
import styles from './AppFooter.module.css';

const { Footer } = Layout;

const ApplicationModal = React.lazy(() => import('@/features/expert/modals/ApplicationModal'));

interface AppFooterProps {
  userRole?: 'client' | 'expert' | 'partner' | 'admin' | string;
}

interface PublicStats {
  total_experts: number;
  total_clients: number;
  total_users: number;
  new_users_today: number;
  total_orders: number;
  completed_orders: number;
  orders_today: number;
  online_users: number;
}

export const AppFooter: React.FC<AppFooterProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  
  const agreementLink = userRole === 'expert' || userRole === 'partner'
    ? '/docs/user_agreement_expert.pdf'
    : '/docs/user_agreement_client.pdf';

  const handleSupportClick = React.useCallback(() => {
    // Перенаправляем на форму подачи жалобы
    window.location.href = '/support/claim-form';
  }, []);

  const handleBecomeExpertClick = async () => {
    setIsCheckingAuth(true);
    try {
      const user = await authApi.getCurrentUser();
      if (user) {
        // Пользователь авторизован - открываем модальное окно
        setApplicationModalVisible(true);
      }
    } catch (error) {
      // Пользователь не авторизован - переходим на страницу регистрации
      navigate('/become-expert');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const services = [
    'Дипломная работа',
    'Курсовая работа',
    'Контрольная работа',
    'Отчет по практике',
    'Реферат',
    'Сочинение',
    'Онлайн-помощь',
    'Чертежи',
    'Эссе',
    'Бизнес-план',
    'Все услуги',
  ];

      const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const response = await apiClient.get<PublicStats>(API_ENDPOINTS.users.publicStats);
      return response.data;
    },
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 30000, // refetch every 30 seconds
  });

  return (
    <Footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.columnsGrid}>
          <div className={styles.columnItem}>
            <h3 className={styles.heading}>Служба поддержки</h3>
            <a href="tel:88005007857" className={styles.contactPhone}>8 (800) 500-78-57</a>
            <a href="mailto:support@okoznaniy.ru" className={styles.contactEmail}>support@okoznaniy.ru</a>
            <span className={styles.workHoursValue}>Пн – Пт: 07:00 – 16:00 (МСК)</span>
            <a href="/support" className={styles.contactButton}>Написать нам</a>
          </div>

          <div className={styles.columnItem}>
            <h3 className={styles.heading}>О проекте</h3>
            <div className={styles.linksInline}>
              <a href="/#about" className={styles.link}>О компании</a>
              <a href={agreementLink} target="_blank" rel="noopener noreferrer" className={styles.link}>Пользовательское соглашение</a>
              <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer" className={styles.link}>Политика конфиденциальности</a>
            </div>
          </div>

          <div className={styles.columnItem}>
            <h3 className={styles.heading}>Статистика</h3>
            <div className={styles.statsInline}>
              <span className={styles.statChip}><strong>{stats?.total_users?.toLocaleString() || 0}</strong> пользователей</span>
              <span className={styles.statChipGreen}><strong>+{stats?.new_users_today?.toLocaleString() || 0}</strong> новых</span>
              <span className={styles.statChip}><strong>{stats?.online_users?.toLocaleString() || 0}</strong> онлайн</span>
              <span className={styles.statChip}><strong>{stats?.orders_today?.toLocaleString() || 0}</strong> заказов/сутки</span>
            </div>
          </div>

          <div className={styles.columnItem}>
            <h3 className={styles.heading}>Услуги</h3>
            <div className={styles.servicesInline}>
            {services.map((service) => (
              <span key={service} className={styles.serviceChip}>{service}</span>
            ))}
            </div>
          </div>

          <div className={styles.columnItem}>
            <h3 className={styles.heading}>Вакансии</h3>
            <button 
              onClick={handleBecomeExpertClick}
              disabled={isCheckingAuth}
              className={styles.becomeExpertButton}
            >
              Стать экспертом
            </button>
          </div>
        </div>

        <div className={styles.copyright}>
          <div className={styles.copyrightText}>
            © {currentYear} «Око Знаний». Все права защищены.
          </div>
          <div className={styles.socialLinks}>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {applicationModalVisible && (
          <ApplicationModal
            visible={applicationModalVisible}
            onClose={() => setApplicationModalVisible(false)}
            application={null}
          />
        )}
      </Suspense>
    </Footer>
  );
};
