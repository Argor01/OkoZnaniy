import React from 'react';
import { Card, Row, Col, Typography, Divider } from 'antd';
import { StatisticsCards } from '../Statistics/StatisticsCards';
import type { AdminStats, Partner, PartnerEarning, Dispute } from '../../types';
import styles from './OverviewSection.module.css';

const { Title, Text, Paragraph } = Typography;

interface OverviewSectionProps {
  stats: AdminStats;
  partners: Partner[];
  earnings: PartnerEarning[];
  disputes: Dispute[];
  isLoading: boolean;
}

/**
 * Секция обзора админской панели
 * Отображает основную статистику и краткую информацию
 */
export const OverviewSection: React.FC<OverviewSectionProps> = ({
  stats,
  partners,
  earnings,
  disputes,
  isLoading,
}) => {
  // Вычисляем дополнительную статистику
  const recentEarnings = earnings
    .filter(e => !e.is_paid)
    .slice(0, 5);

  const recentDisputes = disputes
    .filter(d => !d.resolved)
    .slice(0, 3);

  const topPartners = partners
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, 5);

  return (
    <div className={styles.overviewContainer}>
      {/* Основная статистика */}
      <StatisticsCards stats={stats} loading={isLoading} />

      {/* Детальная информация */}
      <Row gutter={[16, 16]}>
        {/* Топ партнеры */}
        <Col xs={24} lg={8}>
          <Card 
            title="Топ партнеры" 
            className={styles.infoCard}
            loading={isLoading}
          >
            {topPartners.length > 0 ? (
              <div className={styles.listContainer}>
                {topPartners.map((partner, index) => (
                  <div key={partner.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <Text strong>#{index + 1} {partner.username}</Text>
                      <Text type="secondary" className={styles.listItemMeta}>
                        {partner.total_earnings} ₽ • {partner.total_referrals} рефералов
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">Нет данных о партнерах</Text>
            )}
          </Card>
        </Col>

        {/* Невыплаченные начисления */}
        <Col xs={24} lg={8}>
          <Card 
            title="Ожидают выплаты" 
            className={styles.infoCard}
            loading={isLoading}
          >
            {recentEarnings.length > 0 ? (
              <div className={styles.listContainer}>
                {recentEarnings.map((earning) => (
                  <div key={earning.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <Text strong>{earning.partner}</Text>
                      <Text type="secondary" className={styles.listItemMeta}>
                        {earning.amount} ₽ • {earning.earning_type}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">Все начисления выплачены</Text>
            )}
          </Card>
        </Col>

        {/* Активные споры */}
        <Col xs={24} lg={8}>
          <Card 
            title="Активные споры" 
            className={styles.infoCard}
            loading={isLoading}
          >
            {recentDisputes.length > 0 ? (
              <div className={styles.listContainer}>
                {recentDisputes.map((dispute) => (
                  <div key={dispute.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <Text strong>Заказ #{dispute.order.id}</Text>
                      <Text type="secondary" className={styles.listItemMeta}>
                        {dispute.order.client.username} vs {dispute.order.expert?.username || 'Не назначен'}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">Нет активных споров</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Дополнительная информация */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card className={styles.summaryCard}>
            <Title level={4}>Сводка системы</Title>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <div className={styles.summaryItem}>
                  <Text type="secondary">Общий оборот</Text>
                  <Title level={3} className={styles.summaryValue}>
                    {stats.totalEarnings.toLocaleString()} ₽
                  </Title>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className={styles.summaryItem}>
                  <Text type="secondary">Активных партнеров</Text>
                  <Title level={3} className={styles.summaryValue}>
                    {partners.filter(p => p.is_verified).length}
                  </Title>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className={styles.summaryItem}>
                  <Text type="secondary">Средний доход партнера</Text>
                  <Title level={3} className={styles.summaryValue}>
                    {stats.totalPartners > 0 
                      ? Math.round(stats.totalEarnings / stats.totalPartners).toLocaleString()
                      : 0
                    } ₽
                  </Title>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className={styles.summaryItem}>
                  <Text type="secondary">Процент решенных споров</Text>
                  <Title level={3} className={styles.summaryValue}>
                    {stats.totalDisputes > 0 
                      ? Math.round((stats.resolvedDisputes / stats.totalDisputes) * 100)
                      : 0
                    }%
                  </Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};