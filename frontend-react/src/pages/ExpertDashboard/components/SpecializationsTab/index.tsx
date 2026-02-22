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
      <div className={`${styles.sectionCardHeader} ${styles.specializationsHeader}`}>
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
        <div className={styles.specializationsGrid}>
          {specializations.map((spec) => (
            <div key={spec.id} className={styles.orderCard}>
              <div className={styles.specializationHeaderRow}>
                <div>
                  <Title level={4} className={styles.specializationTitle}>
                    {spec.custom_name || spec.subject?.name || 'Специализация'}
                    {spec.is_verified && (
                      <CheckCircleOutlined className={styles.specializationVerifiedIcon} />
                    )}
                  </Title>
                  <Text type="secondary" className={styles.specializationMeta}>
                    Опыт: {spec.experience_years} лет | Ставка: {spec.hourly_rate} ₽/час
                  </Text>
                  {spec.description && (
                    <Paragraph className={styles.specializationDescription}>
                      {spec.description}
                    </Paragraph>
                  )}
                  {spec.skills && (
                    <div className={styles.specializationSkills}>
                      <div className={styles.specializationSkillsList}>
                        {spec.skills.split(',').map((skill: string, index: number) => {
                          const trimmedSkill = skill.trim();
                          return trimmedSkill ? (
                            <Tag key={index} color="blue" className={styles.specializationSkillTag}>
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
