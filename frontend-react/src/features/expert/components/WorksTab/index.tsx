import React from 'react';
import { Empty, Card, Tag, Typography, Button, Spin, Space, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { shopApi } from '@/features/shop/api/shop';
import { UserProfile } from '../../types';
import styles from './WorksTab.module.css';
import { ROUTES } from '@/utils/constants';

const { Paragraph } = Typography;

const workModerationMeta = {
  pending: {
    tagColor: 'gold',
    label: 'На модерации',
    notice: 'Ваша работа на модерации. Подтверждение может занять от 5 минут до 3 часов.',
  },
  approved: {
    tagColor: 'green',
    label: 'Опубликована',
    notice: '',
  },
  rejected: {
    tagColor: 'red',
    label: 'Отклонена',
    notice: 'Работа не прошла модерацию. Проверьте требования или загрузите исправленную версию.',
  },
} as const;

interface WorksTabProps {
  isMobile: boolean;
  userProfile: UserProfile | null;
}

const WorksTab: React.FC<WorksTabProps> = ({ userProfile }) => {
  const navigate = useNavigate();
  const { data: myWorks = [], isLoading } = useQuery({
    queryKey: ['shop-my-works', userProfile?.id],
    queryFn: () => shopApi.getMyWorks(),
    enabled: !!userProfile?.id,
  });

  if (isLoading) {
    return (
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader}>
          <h2 className={styles.sectionTitle}>Мои работы</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <h2 className={styles.sectionTitle}>Мои работы</h2>
      </div>

      {myWorks.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Empty description="У вас пока нет размещённых работ в магазине" />
          <Button
            type="primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(ROUTES.shop.addWork)}
          >
            Разместить работу
          </Button>
        </div>
      ) : (
        <div className={styles.worksGrid}>
          {myWorks.map((work) => {
            const moderation = work.moderation_status
              ? workModerationMeta[work.moderation_status]
              : work.is_active === false
                ? workModerationMeta.rejected
                : workModerationMeta.approved;
            const canOpenWork = moderation === workModerationMeta.approved;

            return (
              <Card
                key={work.id}
                hoverable={canOpenWork}
                className={`${styles.workCard} ${!canOpenWork ? styles.workCardMuted : ''}`}
                onClick={() => {
                  if (canOpenWork) {
                    navigate(ROUTES.shop.workDetail.replace(':workId', String(work.id)));
                  }
                }}
                cover={
                  work.preview ? (
                    <img
                      alt={work.title}
                      src={work.preview}
                      className={styles.workCardImage}
                    />
                  ) : (
                    <div className={styles.workCardPlaceholder}>
                      <FileTextOutlined style={{ fontSize: 48 }} />
                    </div>
                  )
                }
                actions={[
                  <Tooltip title="Просмотров">
                    <Space>
                      <EyeOutlined /> {work.viewsCount || 0}
                    </Space>
                  </Tooltip>,
                  <Tooltip title="Скачиваний">
                    <Space>
                      <DownloadOutlined /> {work.purchasesCount || 0}
                    </Space>
                  </Tooltip>,
                ]}
              >
                <div className={styles.workCardContent}>
                  <div className={styles.workStatusRow}>
                    <Tag color={moderation.tagColor}>{moderation.label}</Tag>
                  </div>
                  {moderation.notice ? (
                    <div className={styles.moderationNotice}>
                      {moderation.notice}
                    </div>
                  ) : null}
                  <div className={styles.workCardTitle} title={work.title}>
                    {work.title}
                  </div>
                  <div className={styles.workCardPrice}>
                    {work.price} ₽
                  </div>
                  <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ fontSize: 14 }}>
                    {work.description}
                  </Paragraph>
                  <div style={{ marginTop: 'auto' }}>
                    <Space wrap size={[0, 8]}>
                      <Tag color="purple">{work.subject_name || 'Предмет'}</Tag>
                      <Tag color="purple">{work.work_type_name || 'Тип'}</Tag>
                    </Space>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorksTab;
