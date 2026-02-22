import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons';
import { ordersApi } from '../api/orders';
import { authApi } from '../api/auth';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './WorkDetail.module.css';

const { Title, Text, Paragraph } = Typography;

const WorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: work, isLoading } = useQuery({
    queryKey: ['work', workId],
    queryFn: () => ordersApi.getById(Number(workId)),
    enabled: !!workId,
  });

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className={styles.notFound}>
        <Title level={3}>Работа не найдена</Title>
        <Button type="primary" onClick={() => navigate('/works')}>
          Вернуться к работам
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      in_progress: 'orange',
      review: 'purple',
      revision: 'gold',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      new: 'Новая',
      in_progress: 'В работе',
      review: 'На проверке',
      revision: 'Доработка',
      completed: 'Завершена',
      cancelled: 'Отменена',
    };
    return texts[status] || status;
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </Button>

        <Card className={styles.mainCard}>
          <Space direction="vertical" size="large" className={styles.fullWidth}>
            <div>
              <Space align="start" className={`${styles.fullWidth} ${styles.headerRow}`}>
                <Title level={isMobile ? 3 : 2} className={styles.workTitle}>{work.title}</Title>
                <Tag color={getStatusColor(work.status)} className={styles.statusTag}>
                  {getStatusText(work.status)}
                </Tag>
              </Space>
            </div>

            <div className={styles.sectionStack}>
              <Card 
                className={styles.clientCard}
              >
                <Space direction="vertical" size={12} className={styles.fullWidth}>
                  <Text type="secondary" className={styles.clientLabel}>
                    ЗАКАЗЧИК
                  </Text>
                  <Space align="center" size={16}>
                    <Avatar 
                      size={48} 
                      src={work.client?.avatar} 
                      icon={<UserOutlined />}
                      className={styles.clientAvatar}
                    />
                    <div>
                      <Button 
                        type="link" 
                        onClick={() => {
                          console.log('Navigating to user profile:', work.client?.id);
                          if (work.client?.id) {
                            navigate(`/user/${work.client.id}`);
                          } else {
                            console.error('Client ID is not available');
                          }
                        }}
                        className={styles.clientLink}
                      >
                        {work.client?.username || work.client_name || 'Неизвестен'}
                      </Button>
                      <div className={styles.clientHint}>
                        Нажмите, чтобы посмотреть профиль
                      </div>
                    </div>
                  </Space>
                </Space>
              </Card>

              <div className={styles.infoGrid}>
                <Card 
                  size="small" 
                  className={styles.infoCard}
                >
                  <Space direction="vertical" size={2} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>
                      Дедлайн
                    </Text>
                    <Space align="center">
                      <CalendarOutlined className={styles.deadlineIcon} />
                      <Text className={styles.deadlineValue}>
                        {work.deadline ? new Date(work.deadline).toLocaleDateString('ru-RU') : 'Не указан'}
                      </Text>
                    </Space>
                  </Space>
                </Card>

                <Card 
                  size="small" 
                  className={styles.infoCard}
                >
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>
                      Предмет
                    </Text>
                    <Text className={styles.subjectValue}>
                      {work.subject?.name || 'Не указан'}
                    </Text>
                  </Space>
                </Card>

                <Card 
                  size="small" 
                  className={styles.infoCard}
                >
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>
                      Стоимость
                    </Text>
                    <Space align="center">
                      <DollarOutlined className={styles.priceIcon} />
                      <Text className={styles.priceValue}>
                        {work.budget} ₽
                      </Text>
                    </Space>
                  </Space>
                </Card>

                <Card 
                  size="small" 
                  className={styles.infoCard}
                >
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>
                      Тип работы
                    </Text>
                    <Text className={styles.subjectValue}>
                      {work.work_type?.name || 'Не указан'}
                    </Text>
                  </Space>
                </Card>

                <Card 
                  size="small" 
                  className={styles.infoCard}
                >
                  <Space direction="vertical" size={4} className={styles.fullWidth}>
                    <Text type="secondary" className={styles.infoLabel}>
                      Выполнена
                    </Text>
                    <Text className={styles.createdValue}>
                      {formatDistanceToNow(new Date(work.updated_at || work.created_at), { addSuffix: true, locale: ru })}
                    </Text>
                  </Space>
                </Card>
              </div>
            </div>

            <Card 
              title="Описание работы"
              className={styles.contentCard}
            >
              <Paragraph className={styles.description}>
                {work.description || 'Описание отсутствует'}
              </Paragraph>
            </Card>

            {work.files && work.files.length > 0 && (
              <Card 
                title="Прикрепленные файлы"
                className={styles.contentCard}
              >
                <Space direction="vertical">
                  {work.files.map((file: any, index: number) => (
                    <a 
                      key={index} 
                      href={file.view_url || file.file_url || file.file || file} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Файл {index + 1}
                    </a>
                  ))}
                </Space>
              </Card>
            )}

            
            {work.expert_rating && (
              <Card 
                title="Оценка работы"
                className={styles.infoCard}
              >
                <Space direction="vertical" size={12}>
                  <Space align="center">
                    <StarOutlined className={styles.ratingIcon} />
                    <Text className={styles.ratingValue}>
                      {work.expert_rating.rating} из 5
                    </Text>
                  </Space>
                  {work.expert_rating.comment && (
                    <Paragraph className={styles.ratingComment}>
                      {work.expert_rating.comment}
                    </Paragraph>
                  )}
                  <Text type="secondary" className={styles.ratingMeta}>
                    Оценка от {formatDistanceToNow(new Date(work.expert_rating.created_at), { addSuffix: true, locale: ru })}
                  </Text>
                </Space>
              </Card>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default WorkDetail;
