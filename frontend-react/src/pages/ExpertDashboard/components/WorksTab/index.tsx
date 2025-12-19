import React from 'react';
import { Button, Typography, Row, Col } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from '../../ExpertDashboard.module.css';

const { Text, Title, Paragraph } = Typography;

interface WorksTabProps {
  isMobile: boolean;
  myCompleted?: any[];
  myInProgress?: any[];
}

const WorksTab: React.FC<WorksTabProps> = ({ isMobile, myCompleted = [], myInProgress = [] }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Мои работы</h2>
      </div>
      
      {/* Краткая статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8} sm={8}>
          <div style={{ 
            background: '#f0fdf4', 
            padding: isMobile ? '12px 8px' : '16px', 
            borderRadius: 12, 
            border: '1px solid #bbf7d0',
            textAlign: 'center'
          }}>
            <CheckCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#10b981', marginBottom: isMobile ? 4 : 8 }} />
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, color: '#10b981' }}>
              {myCompleted.length || 5}
            </div>
            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>Завершенные</Text>
          </div>
        </Col>
        <Col xs={8} sm={8}>
          <div style={{ 
            background: '#fef3c7', 
            padding: isMobile ? '12px 8px' : '16px', 
            borderRadius: 12, 
            border: '1px solid #fde68a',
            textAlign: 'center'
          }}>
            <ClockCircleOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#f59e0b', marginBottom: isMobile ? 4 : 8 }} />
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, color: '#f59e0b' }}>
              {myInProgress.length || 2}
            </div>
            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>В работе</Text>
          </div>
        </Col>
        <Col xs={8} sm={8}>
          <div style={{ 
            background: '#eff6ff', 
            padding: isMobile ? '12px 8px' : '16px', 
            borderRadius: 12, 
            border: '1px solid #bfdbfe',
            textAlign: 'center'
          }}>
            <DollarOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#3b82f6', marginBottom: isMobile ? 4 : 8 }} />
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, color: '#3b82f6' }}>
              {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(
                myCompleted.reduce((sum, order) => sum + (Number(order.budget) || 0), 0) || 30800
              )}
            </div>
            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>Общий доход</Text>
          </div>
        </Col>
      </Row>

      {/* Последние работы */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 16 }}>Последние завершенные работы</Title>
        {myCompleted.length ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {myCompleted.slice(0, 3).map((work: any) => (
              <div key={work.id} className={styles.orderCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                      {work.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {work.subject?.name} • {work.work_type?.name}
                    </Text>
                  </div>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 6, 
                    background: '#d1fae5', 
                    color: '#065f46',
                    fontSize: 12,
                    fontWeight: 500,
                    marginLeft: 12 
                  }}>
                    Завершен
                  </span>
                </div>
                <Paragraph 
                  ellipsis={{ rows: 1 }}
                  style={{ color: '#6b7280', marginBottom: 8, fontSize: 14 }}
                >
                  {work.description}
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: '#10b981', fontSize: 16 }}>
                    {Number(work.budget)?.toLocaleString('ru-RU')} ₽
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {work.client?.first_name} {work.client?.last_name}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Text>У вас пока нет завершенных работ</Text>
          </div>
        )}
      </div>

      {/* Кнопка перехода на полную страницу */}
      <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
        <Button 
          type="primary" 
          size="large"
          className={styles.buttonPrimary}
          onClick={() => navigate('/works')}
          style={{ minWidth: 200 }}
        >
          Посмотреть все работы
        </Button>
      </div>
    </div>
  );
};

export default WorksTab;
