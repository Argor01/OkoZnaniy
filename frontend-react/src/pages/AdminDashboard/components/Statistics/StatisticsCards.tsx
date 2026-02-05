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
import type { AdminStats } from '../../types';
import styles from './StatisticsCards.module.css';

interface StatisticsCardsProps {
  stats: AdminStats;
  loading?: boolean;
}

/**
 * Карточки статистики для обзорной страницы
 * Отображает основные метрики админской панели
 */
export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ 
  stats, 
  loading = false 
}) => {
  return (
    <div className={styles.statisticsContainer}>
      {/* Первая строка - основные метрики */}
      <Row gutter={[16, 16]} className={styles.row}>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="Всего партнеров"
              value={stats.totalPartners}
              prefix={<TeamOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="Всего рефералов"
              value={stats.totalReferrals}
              prefix={<UserOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="Невыплаченные"
              value={stats.unpaidEarnings}
              prefix={<TrophyOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Вторая строка - споры */}
      <Row gutter={[16, 16]} className={styles.row}>
        <Col xs={24} sm={8} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="Всего споров"
              value={stats.totalDisputes}
              prefix={<ExclamationCircleOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="Решено"
              value={stats.resolvedDisputes}
              prefix={<CheckCircleOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={8}>
          <Card className={styles.card}>
            <Statistic
              title="В рассмотрении"
              value={stats.pendingDisputes}
              prefix={<ClockCircleOutlined className={styles.icon} />}
              loading={loading}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};