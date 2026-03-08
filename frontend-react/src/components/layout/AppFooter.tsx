import React from 'react';
import { Layout } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import styles from './AppFooter.module.css';

const { Footer } = Layout;

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
  const currentYear = new Date().getFullYear();
  
  const agreementLink = userRole === 'expert' || userRole === 'partner'
    ? '/docs/user_agreement_expert.pdf'
    : '/docs/user_agreement_client.pdf';

  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const response = await apiClient.get<PublicStats>(API_ENDPOINTS.users.publicStats);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <Footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Column 1: Support + About Project */}
          <div className={styles.column}>
            <div className={styles.section}>
              <h3 className={styles.heading}>Служба поддержки</h3>
              <div>
                <a href="tel:88005007857" className={styles.contactPhone}>8 (800) 500-78-57</a>
                <a href="mailto:support@okoznaniy.ru" className={styles.contactEmail}>support@okoznaniy.ru</a>
              </div>
              <div>
                <span className={styles.workHoursLabel}>График работы</span>
                <span className={styles.workHoursValue}>Пн – Пт: 07:00 – 16:00 (МСК)</span>
              </div>
              <a href="/support" className={styles.contactButton}>
                Написать нам
              </a>
            </div>

            <div className={styles.section} style={{ marginTop: '24px' }}>
              <h3 className={styles.heading}>О проекте</h3>
              <ul className={styles.list}>
                <li><a href="/about" className={styles.link}>О компании</a></li>
                <li><a href={agreementLink} target="_blank" rel="noopener noreferrer" className={styles.link}>Пользовательское соглашение</a></li>
                <li><a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer" className={styles.link}>Политика конфиденциальности</a></li>
                <li><a href="/legal" className={styles.link}>Юридическая информация</a></li>
                <li><a href="/guarantees" className={styles.link}>Гарантии</a></li>
                <li><a href="/payment" className={styles.link}>Об оплате</a></li>
                <li><a href="/safe-deal" className={styles.link}>Безопасная сделка</a></li>
                <li><a href="/reviews" className={styles.link}>Отзывы</a></li>
                <li><a href="/experts/top" className={styles.link}>Топ экспертов</a></li>
                <li><a href="/agencies" className={styles.link}>Агентствам</a></li>
                <li><a href="/partners" className={styles.link}>Партнёрская программа</a></li>
                <li><a href="/faq" className={styles.link}>Вопросы и ответы</a></li>
                <li><a href="/contacts" className={styles.link}>Контакты</a></li>
                <li><a href="/universities" className={styles.link}>ВУЗы</a></li>
                <li><a href="/sitemap" className={styles.link}>Карта сайта</a></li>
              </ul>
            </div>
          </div>

          {/* Column 2: Vacancies + Statistics */}
          <div className={styles.column}>
            <div className={styles.section}>
              <h3 className={styles.heading}>Вакансии</h3>
              <ul className={styles.list}>
                <li><a href="/become-author" className={styles.link}>Стать автором</a></li>
                <li><a href="/vacancies" className={styles.link}>Все вакансии</a></li>
                <li><a href="/vacancies/teachers" className={styles.link}>Работа для преподавателей</a></li>
                <li><a href="/vacancies/tutors" className={styles.link}>Работа для репетиторов</a></li>
                <li><a href="/vacancies/school-teachers" className={styles.link}>Работа для учителей</a></li>
                <li><a href="/vacancies/students" className={styles.link}>Работа для студентов</a></li>
              </ul>
            </div>

            <div className={styles.section} style={{ marginTop: '24px' }}>
              <h3 className={styles.heading}>Статистика</h3>
              <ul className={styles.statsList}>
                <li className={styles.statRow}>
                  <span className={styles.statValue}>{stats?.total_users?.toLocaleString() || 0}</span>
                  <span className={styles.statLabel}> пользователей</span>
                </li>
                <li className={styles.statRow}>
                  <span className={styles.statValueGreen}>+{stats?.new_users_today?.toLocaleString() || 0}</span>
                  <span className={styles.statLabelGreen}> новых пользователя</span>
                </li>
                <li className={styles.statRow}>
                  <span className={styles.statValue}>{stats?.online_users?.toLocaleString() || 0}</span>
                  <span className={styles.statLabel}> сейчас на сайте</span>
                </li>
                <li className={styles.statRow}>
                  <span className={styles.statValue}>{stats?.orders_today?.toLocaleString() || 0}</span>
                  <span className={styles.statLabel}> заказ в сутки</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 3: Services + Extra Links */}
          <div className={styles.column}>
            <div className={styles.section}>
              <h3 className={styles.heading}>Услуги</h3>
              <ul className={styles.list}>
                <li><a href="/services/diploma" className={styles.link}>Дипломная работа</a></li>
                <li><a href="/services/coursework" className={styles.link}>Курсовая работа</a></li>
                <li><a href="/services/control" className={styles.link}>Контрольная работа</a></li>
                <li><a href="/services/report" className={styles.link}>Отчет по практике</a></li>
                <li><a href="/services/essay" className={styles.link}>Реферат</a></li>
                <li><a href="/services/composition" className={styles.link}>Сочинение</a></li>
                <li><a href="/services/online-help" className={styles.link}>Онлайн-помощь</a></li>
                <li><a href="/services/drawings" className={styles.link}>Чертежи</a></li>
                <li><a href="/services/essay-short" className={styles.link}>Эссе</a></li>
                <li><a href="/services/business-plan" className={styles.link}>Бизнес-план</a></li>
                <li><a href="/services" className={styles.link}>Все услуги</a></li>
              </ul>
            </div>
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
    </Footer>
  );
};
