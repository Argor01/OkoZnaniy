import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Typography, Space, Tag, Avatar, Spin, message, Rate, List, Popconfirm } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined, DollarOutlined, StarOutlined, ShoppingCartOutlined, EyeOutlined, FileOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { shopApi } from '../api/shop';
import { authApi } from '../api/auth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { WorkFile } from './ShopReadyWorks/types';
import { useDashboard } from '../contexts/DashboardContext';

const { Title, Text } = Typography;

const ShopWorkDetail: React.FC = () => {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const dashboard = useDashboard();
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

  const { data: purchases = [] } = useQuery({
    queryKey: ['shop-purchases'],
    queryFn: () => shopApi.getPurchases(),
  });

  
  const work = React.useMemo(() => {
    if (!works || !workId) return null;
    return works.find((w) => w.id === Number(workId));
  }, [works, workId]);

  const purchase = React.useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    const id = Number(workId);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    return list.find((p) => p.work === id);
  }, [purchases, workId]);

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
    const sellerId = work?.author?.id;
    if (!sellerId) {
      message.error('Не удалось открыть чат: неизвестен продавец');
      return;
    }
    shopApi
      .purchaseWork(work.id)
      .then(() => {
        dashboard.openContextChat(sellerId, work.title, work.id);
      })
      .catch((error: any) => {
        const detail = error?.response?.data?.error || error?.response?.data?.detail;
        message.error(detail || 'Не удалось купить работу');
      });
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
            <div>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>{work.title}</Title>
                <Tag color="blue" style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? '2px 8px' : '4px 12px' }}>
                  {work.work_type_name || work.workType || work.category || 'Тип работы'}
                </Tag>
              </Space>
            </div>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        onClick={() => navigate(`/user/${work.author?.id}`)}
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

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 16 
              }}>

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
                            {formatCurrency(work.originalPrice)}
                          </Text>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: 700, color: '#389e0d' }}>
                          {formatCurrency(work.price)}
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
                  renderItem={(file: WorkFile) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            const fileWithLinks = file as WorkFile & { view_url?: string; file_url?: string };
                            const url = fileWithLinks.view_url || fileWithLinks.file_url || file.file;
                            if (url) {
                              window.open(url, '_blank');
                            }
                          }}
                        >
                          Открыть
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

            
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              {userProfile?.id === work.author?.id ? (

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
              ) : purchase ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  disabled={!purchase.delivered_file_available}
                  onClick={async () => {
                    if (!purchase.delivered_file_available) return;
                    try {
                      const blob = await shopApi.downloadPurchaseFile(purchase.id);
                      const blobUrl = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = purchase.delivered_file_name || 'file';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (e: unknown) {
                      const status = (e as { response?: { status?: number } })?.response?.status;
                      if (status === 401) {
                        message.error('Не авторизовано для скачивания файла');
                      } else {
                        message.error('Ошибка при скачивании файла');
                      }
                    }
                  }}
                  style={{
                    minWidth: isMobile ? '100%' : 200,
                    height: 48,
                    fontSize: 16,
                    background: '#10b981',
                    borderColor: '#10b981',
                  }}
                >
                  Скачать
                </Button>
              ) : (

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
                  Купить за {formatCurrency(work.price)}
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
