import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Rate, List, Popconfirm } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined, ShoppingCartOutlined, EyeOutlined, FileOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { shopApi } from '../api/shop';
import { authApi } from '../api/auth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;

const ShopWorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const { data: works } = useQuery({
    queryKey: ['shop-works'],
    queryFn: () => shopApi.getWorks(),
  });

  // Находим работу по ID
  const work = React.useMemo(() => {
    if (!works || !workId) return null;
    return works.find((w: any) => w.id === Number(workId));
  }, [works, workId]);

  const deleteMutation = useMutation({
    mutationFn: (workId: number) => shopApi.deleteWork(workId),
    onSuccess: () => {
      message.success('Работа успешно удалена!');
      queryClient.invalidateQueries({ queryKey: ['shop-works'] });
      navigate('/shop/ready-works');
    },
    onError: () => {
      message.error('Ошибка при удалении работы');
    },
  });

  if (!works) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!work) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Title level={3}>Работа не найдена</Title>
        <Button type="primary" onClick={() => navigate('/shop/ready-works')}>
          Вернуться к магазину
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteMutation.mutate(work.id);
  };

  const handlePurchase = () => {
    // TODO: Реализовать покупку
    message.info('Функция покупки будет реализована позже');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: isMobile ? '16px' : '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </Button>

        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Заголовок и превью */}
            <div>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{work.title}</Title>
                <Tag color="blue" style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                  {work.work_type_name || work.workType || work.category || 'Тип работы'}
                </Tag>
              </Space>
            </div>

            {/* Превью изображение */}
            {work.preview && (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={work.preview} 
                  alt={work.title}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    borderRadius: 8,
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}

            {/* Основная информация */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Автор - большая плашка на всю ширину */}
              <Card 
                style={{ 
                  background: 'linear-gradient(135deg, #f9f0ff 0%, #f0e6ff 100%)', 
                  border: '2px solid #d3adf7',
                  borderRadius: 16,
                  boxShadow: '0 4px 12px rgba(114, 46, 209, 0.15)',
                  padding: '8px 16px'
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>
                    АВТОР
                  </Text>
                  <Space align="center" size={16}>
                    <Avatar 
                      size={48} 
                      src={work.author?.avatar} 
                      icon={<UserOutlined />}
                      style={{ 
                        border: '3px solid #722ed1',
                        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.2)'
                      }}
                    />
                    <div>
                      <Button 
                        type="link" 
                        onClick={() => {
                          console.log('Full work object:', work);
                          console.log('Author object:', work.author);
                          console.log('Author ID:', work.author?.id);
                          console.log('Author user_id:', work.author?.user_id);
                          console.log('Author user:', work.author?.user);
                          
                          // Попробуем разные варианты ID
                          const authorId = work.author?.id || work.author?.user_id || work.author?.user?.id || work.author_id;
                          console.log('Trying author ID:', authorId);
                          
                          if (authorId) {
                            navigate(`/user/${authorId}`);
                          } else {
                            console.error('Author ID is not available in any format');
                          }
                        }}
                        style={{ 
                          padding: 0, 
                          height: 'auto',
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#722ed1'
                        }}
                      >
                        {work.author_name || work.author?.name || work.author?.username || 'Автор'}
                      </Button>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        Нажмите, чтобы посмотреть профиль
                      </div>
                    </div>
                  </Space>
                </Space>
              </Card>

              {/* Остальные плашки в сетке */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16 
              }}>

                {/* Просмотры */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                  styles={{ body: { padding: '12px' } }}
                >
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      Просмотры
                    </Text>
                    <Space align="center" style={{ justifyContent: 'center', width: '100%' }}>
                      <EyeOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#595959' }}>
                        {work.viewsCount || 0}
                      </Text>
                    </Space>
                  </div>
                </Card>

                {/* Предмет */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Предмет
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
                      {work.subject_name || work.subject || 'Не указан'}
                    </Text>
                  </Space>
                </Card>

                {/* Цена */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Цена
                    </Text>
                    <Space align="center">
                      <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      <Space direction="vertical" size={0}>
                        {work.discount && work.originalPrice && (
                          <Text delete type="secondary" style={{ fontSize: 12 }}>
                            {work.originalPrice} ₽
                          </Text>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                          {work.price} ₽
                        </Text>
                      </Space>
                      {work.discount && (
                        <Tag color="red" style={{ marginLeft: 8 }}>
                          -{work.discount}%
                        </Tag>
                      )}
                    </Space>
                  </Space>
                </Card>

                {/* Рейтинг */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Рейтинг
                    </Text>
                    <Space align="center">
                      <StarOutlined style={{ color: '#faad14', fontSize: 16 }} />
                      <Rate disabled value={work.rating} style={{ fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
                        ({work.reviewsCount || 0})
                      </Text>
                    </Space>
                  </Space>
                </Card>

                {/* Дата создания */}
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                      Создана
                    </Text>
                    <Space align="center">
                      <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                      <Text style={{ fontSize: 13, fontWeight: 600, color: '#595959' }}>
                        {work.created_at || work.createdAt ? format(new Date(work.created_at || work.createdAt), 'dd.MM.yyyy', { locale: ru }) : 'Недавно'}
                      </Text>
                    </Space>
                  </Space>
                </Card>
              </div>
            </div>

            {/* Описание */}
            <Card 
              title="Описание работы"
              style={{ 
                borderRadius: 12,
                marginBottom: 24
              }}
            >
              <div 
                style={{ 
                  padding: 0
                }}
                dangerouslySetInnerHTML={{ __html: work.description || 'Описание отсутствует' }}
              />
            </Card>

            {/* Прикрепленные файлы */}
            {work.files && work.files.length > 0 && (
              <Card 
                title="Прикрепленные файлы"
                style={{ 
                  borderRadius: 12,
                  marginBottom: 24
                }}
              >
                <List
                  dataSource={work.files}
                  renderItem={(file: any) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            if (file.file) {
                              window.open(file.file, '_blank');
                            }
                          }}
                        >
                          Скачать
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                        title={file.name}
                        description={`${file.file_type || 'Неизвестный тип'} • ${formatFileSize(file.file_size || 0)}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* Кнопки действий */}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              {userProfile?.id === work.author?.id ? (
                // Если это работа текущего пользователя - показываем кнопку удаления
                <Popconfirm
                  title="Удалить работу?"
                  description="Вы уверены, что хотите удалить эту работу? Это действие нельзя отменить."
                  onConfirm={handleDelete}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Button 
                    danger
                    size="large" 
                    icon={<DeleteOutlined />}
                    loading={deleteMutation.isPending}
                    style={{ 
                      minWidth: isMobile ? '100%' : 200,
                      height: 48,
                      fontSize: 16
                    }}
                  >
                    Удалить работу
                  </Button>
                </Popconfirm>
              ) : (
                // Если это чужая работа - показываем кнопку покупки
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ShoppingCartOutlined />}
                  onClick={handlePurchase}
                  style={{ 
                    minWidth: isMobile ? '100%' : 200,
                    height: 48,
                    fontSize: 16
                  }}
                >
                  Купить за {work.price} ₽
                </Button>
              )}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ShopWorkDetail;