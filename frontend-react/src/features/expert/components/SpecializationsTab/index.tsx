import React from 'react';
import { Typography, Spin, Space, Tag, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, CheckCircleOutlined, DeleteOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { Specialization } from '@/features/expert/api/experts';
import styles from './SpecializationsTab.module.css';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';

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
    <AppCard className={styles.sectionCard}>
      <div className={`${styles.sectionCardHeader} ${styles.specializationsHeader}`}>
        <h2 className={styles.sectionTitle}>Мои специализации</h2>
        <AppButton 
          variant="primary"
          icon={<EditOutlined />}
          onClick={onAdd}
        >
          {!isMobile && 'Добавить'}
        </AppButton>
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
            <AppCard key={spec.id} className={styles.specCard}>
              <div className={styles.specCardHeader}>
                <div className={styles.specCardHeaderInfo}>
                  <Title level={4} className={styles.specTitle}>
                    {spec.custom_name || spec.subject?.name || 'Специализация'}
                    {spec.is_verified && (
                      <CheckCircleOutlined className={styles.verifiedIcon} />
                    )}
                  </Title>
                  <Space size={8} wrap className={styles.specTags}>
                    <Tag className={styles.largeTag} color="blue">
                      Опыт: {spec.experience_years} {spec.experience_years === 1 ? 'год' : [2, 3, 4].includes(spec.experience_years % 10) && ![12, 13, 14].includes(spec.experience_years % 100) ? 'года' : 'лет'}
                    </Tag>
                    <Tag className={styles.largeTag} color="green">
                      {spec.hourly_rate} ₽/час
                    </Tag>
                    {spec.is_verified && (
                      <Tag color="success" className={styles.verifiedTag}>
                        Проверено
                      </Tag>
                    )}
                  </Space>
                </div>
                
                <div className={styles.specCardActions}>
                  <div className={styles.specCardActionsRow}>
                    <Tooltip title="Редактировать">
                      <AppButton
                        variant="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(spec)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Удалить специализацию?"
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={() => onDelete(spec)}
                    >
                      <AppButton
                        variant="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </div>
                </div>
              </div>

              {spec.description && (
                <Paragraph 
                  ellipsis={{ rows: 2 }}
                  className={styles.specDescription}
                >
                  {spec.description}
                </Paragraph>
              )}

              {spec.skills && (
                <div className={styles.skillsBlock}>
                  <Space size={8} wrap>
                    {spec.skills.split(',').map((skill: string, index: number) => {
                      const trimmedSkill = skill.trim();
                      return trimmedSkill ? (
                        <Tag key={index} color="default" className={styles.skillTag}>
                          {trimmedSkill}
                        </Tag>
                      ) : null;
                    })}
                  </Space>
                </div>
              )}
            </AppCard>
          ))}
        </div>
      )}
    </AppCard>
  );
};

export default SpecializationsTab;
