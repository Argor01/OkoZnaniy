import React, { useMemo } from 'react';
import { Empty, Card, Tag, Typography, Button, Spin, Space, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { shopApi } from '@/features/shop/api/shop';
import { UserProfile } from '../../types';
import { Work } from '@/features/shop/types/shop';
import styles from './WorksTab.module.css';

const { Text, Paragraph } = Typography;

interface WorksTabProps {
  isMobile: boolean;
  userProfile: UserProfile | null;
}

const WorksTab: React.FC<WorksTabProps> = ({ isMobile, userProfile }) => {
  const { data: allWorks, isLoading } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  const myWorks = useMemo(() => {
    if (!allWorks || !userProfile) return [];
    return allWorks.filter((work: Work) => work.author.id === userProfile.id);
  }, [allWorks, userProfile]);

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
          <Empty description="У вас пока нет размещенных работ в магазине" />
          <Button 
            type="primary" 
            style={{ marginTop: 16 }}
            href="/shop/add"
          >
            Разместить работу
          </Button>
        </div>
      ) : (
        <div className={styles.worksGrid}>
          {myWorks.map((work) => (
            <Card
              key={work.id}
              hoverable
              className={styles.workCard}
              cover={
                work.preview ? (
                  <img
                    alt={work.title}
                    src={work.preview}
                    className={styles.workCardImage}
                  />
                ) : (
                  <div 
                    className={styles.workCardImage} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: '#f0f2f5',
                      color: '#bfbfbf'
                    }}
                  >
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
                    <Tag color="blue">{work.subject_name || 'Предмет'}</Tag>
                    <Tag color="purple">{work.work_type_name || 'Тип'}</Tag>
                  </Space>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorksTab;
