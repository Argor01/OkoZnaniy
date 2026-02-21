import React from 'react';
import { Card, Row, Col, Typography, Divider } from 'antd';
import { StatisticsCards } from '../Statistics/StatisticsCards';
import type { AdminStats, Partner, PartnerEarning } from '../../types';
import styles from './OverviewSection.module.css';

const { Title, Text, Paragraph } = Typography;


interface OverviewSectionProps {
  stats: AdminStats;
  partners: Partner[];
  earnings: PartnerEarning[];
  isLoading: boolean;
}


export const OverviewSection: React.FC<OverviewSectionProps> = ({
  stats,
  partners,
  earnings,
  isLoading,
}) => {
  
  const recentEarnings = earnings
    .filter(e => !e.is_paid)
    .slice(0, 5);

  const topPartners = partners
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, 5);

  return (
    <div className={styles.overviewContainer}>
      <StatisticsCards stats={stats} loading={isLoading} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
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

        <Col xs={24} lg={12}>
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
      </Row>


    </div>
  );
};