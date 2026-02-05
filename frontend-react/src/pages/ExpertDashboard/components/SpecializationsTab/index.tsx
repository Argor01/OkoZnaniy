import React from 'react';
import { Button, Typography, Spin, Space, Tag } from 'antd';
import { EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Specialization } from '../../../../api/experts';
import styles from '../../ExpertDashboard.module.css';

const { Title, Text, Paragraph } = Typography;

interface SpecializationsTabProps {
  specializations: Specialization[];
  specializationsLoading: boolean;
  isMobile: boolean;
  onEdit: (spec: Specialization) => void;
  onAdd: () => void;
  onDelete: (spec: Specialization) => void;
}

const SpecializationsTab: React.FC<SpecializationsTabProps> = ({
  specializations,
  specializationsLoading,
  isMobile,
  onEdit,
  onAdd,
  onDelete,
}) => {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className={styles.sectionTitle}>Мои специализации</h2>
        <Button 
          type="primary"
          icon={<EditOutlined />}
          className={styles.buttonPrimary}
          onClick={onAdd}
        >
          {!isMobile && 'Добавить'}
        </Button>
      </div>
      {specializationsLoading ? (
        <div className={styles.emptyState}>
          <Spin size="large" />
        </div>
      ) : specializations.length === 0 ? (
        <div className={styles.emptyState}>
          <Text>У вас пока нет специализаций. Добавьте первую специализацию, чтобы начать получать заказы.</Text>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {specializations.map((spec) => (
            <div key={spec.id} className={styles.orderCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                    {spec.custom_name || spec.subject?.name || 'Специализация'}
                    {spec.is_verified && (
                      <CheckCircleOutlined style={{ color: '#10b981', marginLeft: 8 }} />
                    )}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Опыт: {spec.experience_years} лет | Ставка: {spec.hourly_rate} ₽/час
                  </Text>
                  {spec.description && (
                    <Paragraph style={{ marginTop: 8, color: '#6b7280' }}>
                      {spec.description}
                    </Paragraph>
                  )}
                  {spec.skills && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {spec.skills.split(',').map((skill: string, index: number) => {
                          const trimmedSkill = skill.trim();
                          return trimmedSkill ? (
                            <Tag key={index} color="blue" style={{ padding: '4px 12px', fontSize: 13 }}>
                              {trimmedSkill}
                            </Tag>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <Space>
                  <Button
                    size="small"
                    onClick={() => onEdit(spec)}
                  >
                    Изменить
                  </Button>

                    <Button
                      size="small"
                      danger
                       onClick={() => onDelete(spec)}
                    >
                      Удалить
                    </Button>
                </Space>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpecializationsTab;
