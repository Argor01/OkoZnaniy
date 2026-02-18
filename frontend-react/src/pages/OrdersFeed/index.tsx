import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Space, Empty, Spin, Input, Select, Row, Col, InputNumber, message, Avatar, Divider, Tooltip } from 'antd';
import { ClockCircleOutlined, SearchOutlined, FilterOutlined, UserOutlined, DeleteOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FileZipOutlined, DownloadOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type Order, type OrderFile } from '../../api/orders';
import { catalogApi, type Subject, type WorkType } from '../../api/catalog';
import { authApi } from '../../api/auth';
import { ORDER_STATUS_COLORS, ORDER_STATUS_TEXTS } from '../../config/orderStatuses';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import styles from './OrdersFeed.module.css';
import { formatCurrency } from '../../utils/formatters';
import BidModal from './BidModal';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Title, Text, Paragraph } = Typography;

type OrdersFeedOrder = Order & {
  subject_id?: number;
  work_type_id?: number;
  responses_count?: number;
  user_has_bid?: boolean;
  is_active?: boolean;
  deleted?: boolean;
  subject_name?: string;
  work_type_name?: string;
  client_avatar?: string;
  client_orders_count?: number;
  custom_subject?: string;
  custom_work_type?: string;
  files?: Array<
    Partial<OrderFile> & {
      id?: number | string;
      filename?: string;
      file_name?: string;
      file_size?: string;
      file_url?: string | null;
      view_url?: string | null;
      download_url?: string | null;
      file?: string | null;
      file_type?: string;
    }
  >;
};

const OrdersFeed: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedWorkType, setSelectedWorkType] = useState<number | undefined>();
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 30000]);
  const [responsesFilter, setResponsesFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 840);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedOrderForBid, setSelectedOrderForBid] = useState<OrdersFeedOrder | null>(null);
  const [myBidsByOrderId, setMyBidsByOrderId] = useState<Record<number, boolean | 'loading'>>({});

  // Загружаем профиль пользователя
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: fetchedSubjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загружаем заказы (все доступные заказы для всех пользователей)
  const { data: ordersData, isLoading: ordersLoading } = useQuery<OrdersFeedOrder[]>({
    queryKey: ['orders-feed'],
    queryFn: async () => {
      console.log('🔄 Загрузка заказов из API...');
      console.log('👤 Текущий пользователь:', userProfile);
      console.log('🎭 Роль пользователя:', userProfile?.role);
      const data = await ordersApi.getAvailableOrders();
      console.log('📦 Получены заказы:', data);
      console.log('📊 Количество заказов:', data?.results?.length || data?.length || 0);
      if ((data?.results?.length || data?.length || 0) === 0) {
        console.warn('⚠️ Заказов нет! Возможные причины:');
        if (userProfile?.role === 'client') {
          console.warn('   ❗ Вы вошли как КЛИЕНТ - клиенты не видят свои заказы в ленте');
          console.warn('   💡 РЕШЕНИЕ: Перейдите на главный дашборд → https://okoznaniy.ru/expert');
          console.warn('   📋 Там вы увидите все свои созданные заказы во вкладке "Заказы"');
        } else {
          console.warn('   1. Все заказы уже взяты в работу');
          console.warn('   2. Нет заказов в статусе "new"');
          console.warn('   3. Нет заказов от других клиентов');
        }
      }
      return data;
    },
  });

  // Загружаем справочники
  const { data: workTypes = [] } = useQuery<WorkType[]>({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Используем реальные данные с API
  const orders = React.useMemo(() => {
    if (!Array.isArray(ordersData)) return [];
    return ordersData.filter((order) => {
      if (!order) return false;
      if (order.is_active === false) return false;
      if (order.deleted === true) return false;
      return !!order.id && !!order.title;
    });
  }, [ordersData]);

  React.useEffect(() => {
    if (userProfile?.role !== 'expert') return;
    if (typeof userProfile?.id !== 'number') return;
    if (!Array.isArray(orders) || orders.length === 0) return;

    let cancelled = false;
    const toFetch = orders.filter((o) => {
      if (typeof o?.id !== 'number') return false;
      if (typeof o.user_has_bid === 'boolean') return false;
      if (Array.isArray(o.bids)) return false;
      return myBidsByOrderId[o.id] === undefined;
    });

    if (toFetch.length === 0) return;

    setMyBidsByOrderId((prev) => {
      const next = { ...prev };
      for (const o of toFetch) next[o.id] = 'loading';
      return next;
    });

    (async () => {
      for (const o of toFetch) {
        try {
          const bids = await ordersApi.getBids(o.id);
          const hasBid = Array.isArray(bids)
            ? bids.some((bid) => bid.expert?.id === userProfile.id && (bid.status || 'active') === 'active')
            : false;
          if (!cancelled) {
            setMyBidsByOrderId((prev) => ({ ...prev, [o.id]: hasBid }));
          }
        } catch {
          if (!cancelled) {
            setMyBidsByOrderId((prev) => ({ ...prev, [o.id]: false }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orders, userProfile?.role, userProfile?.id, myBidsByOrderId]);

  // Фильтрация заказов
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !searchText || 
      order.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesSubject = !selectedSubject || order.subject_id === selectedSubject;
    const matchesWorkType = !selectedWorkType || order.work_type_id === selectedWorkType;
    
    const orderBudget = Number(order.budget);
    const matchesBudget =
      Number.isFinite(orderBudget) && orderBudget >= budgetRange[0] && orderBudget <= budgetRange[1];
    
    const matchesResponses = 
      responsesFilter === 'all' ||
      (responsesFilter === 'none' && order.responses_count === 0) ||
      (responsesFilter === 'few' && order.responses_count > 0 && order.responses_count <= 5) ||
      (responsesFilter === 'many' && order.responses_count > 5);

    return matchesSearch && matchesSubject && matchesWorkType && matchesBudget && matchesResponses;
  });

  const getStatusColor = (status: string) => ORDER_STATUS_COLORS[status] || 'default';
  const getStatusText = (status: string) => ORDER_STATUS_TEXTS[status] || status;

  // Проверка, является ли пользователь владельцем заказа
  const isOrderOwner = (order: OrdersFeedOrder) => {
    return order.client?.id === userProfile?.id || 
           order.client_id === userProfile?.id;
  };

  // Удаление заказа
  const handleDeleteOrder = async (orderId: number) => {
    try {
      await ordersApi.deleteOrder(orderId);
      message.success('Заказ успешно удален');
      // Обновить список заказов
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Ошибка при удалении заказа';
      message.error(errorMessage);
    }
  };

  const handleDownloadOrderFile = React.useCallback(
    async (orderId: number, file: OrdersFeedOrder['files'][number]) => {
    try {
      const fileIdNum = Number(file?.id);
      const filename = file?.filename || file?.file_name || 'file';

      if (!fileIdNum || Number.isNaN(fileIdNum)) {
        const url = file?.view_url || file?.file_url || file?.file;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
        message.error('Не удалось скачать файл');
        return;
      }

      const blob = await ordersApi.downloadOrderFile(orderId, fileIdNum);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
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
    },
    []
  );

  return (
    <div className={styles.contentContainer}>
      {/* Заголовок и кнопка создания */}
      {!isMobile && (
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
              Лента работ
            </Title>
            <Text type="secondary">
              Найдите подходящий заказ или создайте свой
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/create-order')}
            className={styles.primaryButton}
          >
            Создать заказ
          </Button>
        </div>
      )}

      {/* Фильтры */}
      <Card 
        className={styles.filterCard}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Input
              size="large"
              placeholder="Поиск по названию или описанию..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={8}>
            <Select
              size="large"
              placeholder="Предмет"
              style={{ width: '100%' }}
              value={selectedSubject}
              onChange={setSelectedSubject}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              {(fetchedSubjects || []).map((subject: Subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={8}>
            <Select
              size="large"
              placeholder="Тип работы"
              style={{ width: '100%' }}
              value={selectedWorkType}
              onChange={setSelectedWorkType}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              {(workTypes || []).map((workType: WorkType) => (
                <Select.Option key={workType.id} value={workType.id}>
                  {workType.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Дополнительные фильтры */}
        <div style={{ marginTop: 16 }}>
          <Button 
            type="link" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ padding: 0, marginBottom: showFilters ? 16 : 0 }}
          >
            {showFilters ? 'Скрыть фильтры' : 'Показать больше фильтров'}
          </Button>
        </div>

        {showFilters && (
          <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Бюджет</Text>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ whiteSpace: 'nowrap' }}>От</Text>
                  <InputNumber
                    size="large"
                    min={0}
                    max={budgetRange[1]}
                    value={budgetRange[0]}
                    onChange={(value) => setBudgetRange([value || 0, budgetRange[1]])}
                    placeholder="0"
                    controls={false}
                    style={{ width: 120 }}
                    formatter={(value) => `${value} ₽`}
                    parser={(value) => {
                      const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
                      return Number.isFinite(num) ? num : 0;
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ whiteSpace: 'nowrap' }}>До</Text>
                  <InputNumber
                    size="large"
                    min={budgetRange[0]}
                    max={100000}
                    value={budgetRange[1]}
                    onChange={(value) => setBudgetRange([budgetRange[0], value || 30000])}
                    placeholder="30000"
                    controls={false}
                    style={{ width: 120 }}
                    formatter={(value) => `${value} ₽`}
                    parser={(value) => {
                      const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
                      return Number.isFinite(num) ? num : 0;
                    }}
                  />
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Количество откликов</Text>
              </div>
              <Select
                size="large"
                placeholder="Все заказы"
                style={{ width: '100%' }}
                value={responsesFilter}
                onChange={setResponsesFilter}
              >
                <Select.Option value="all">Все заказы</Select.Option>
                <Select.Option value="none">Без откликов</Select.Option>
                <Select.Option value="few">1-5 откликов</Select.Option>
                <Select.Option value="many">Более 5 откликов</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Найдено заказов</Text>
              </div>
              <div style={{ 
                fontSize: 24, 
                fontWeight: 600, 
                color: '#667eea',
                lineHeight: '40px'
              }}>
                {filteredOrders.length}
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Список заказов */}
      {ordersLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Empty
          description={
            <div>
              <Text style={{ fontSize: 16, color: '#999' }}>
                {searchText || selectedSubject || selectedWorkType 
                  ? 'Заказы не найдены. Попробуйте изменить фильтры.'
                  : userProfile?.role === 'client' 
                    ? 'В ленте пока нет заказов от других клиентов'
                    : 'Пока нет доступных заказов'}
              </Text>
            </div>
          }
          style={{ padding: '60px 0' }}
        >
          {userProfile?.role !== 'client' && (
            <Button 
              type="primary" 
              size="large"
              onClick={() => navigate('/create-order')}
            >
              Создать первый заказ
            </Button>
          )}
        </Empty>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredOrders.map((order: OrdersFeedOrder) => {
            // Логируем данные заказа для отладки
            if (order.files) {
              console.log(`Заказ #${order.id} имеет ${order.files.length} файлов:`, order.files);
            }

            const cachedMyBid = typeof order.id === 'number' ? myBidsByOrderId[order.id] : undefined;
            const checkingMyBid = cachedMyBid === 'loading';
            const hasMyBid =
              userProfile?.role === 'expert'
                ? (typeof order.user_has_bid === 'boolean'
                    ? order.user_has_bid
                    : (Array.isArray(order.bids) && order.bids.some((bid) => bid.expert?.id === userProfile?.id))
                      ? true
                      : (typeof cachedMyBid === 'boolean' ? cachedMyBid : false))
                : false;
            
            return (
            <Card
              key={order.id}
              hoverable
              className={styles.orderCard}
              styles={{ body: { padding: 24 } }}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <Title 
                    level={4} 
                    style={{ 
                      margin: 0, 
                      marginBottom: 12, 
                      fontSize: 20, 
                      fontWeight: 700,
                      color: '#1890ff',
                      cursor: 'pointer',
                    }}
                  >
                    {order.title}
                  </Title>
                  <Space size={8} wrap>
                    <Tag className={styles.statusTag} color={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Tag>
                    {(order.custom_subject || order.subject?.name || order.subject_name) && (
                      <Tag className={styles.subjectTag}>
                        {order.custom_subject || order.subject?.name || order.subject_name}
                      </Tag>
                    )}
                    {(order.custom_work_type || order.work_type?.name || order.work_type_name) && (
                      <Tag className={styles.workTypeTag}>
                        {order.custom_work_type || order.work_type?.name || order.work_type_name}
                      </Tag>
                    )}
                    {order.topic?.name && (
                      <Tag className={styles.topicTag}>
                        Тема: {order.topic.name}
                      </Tag>
                    )}
                  </Space>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Tooltip title="Скопировать ссылку на заказ">
                      <Button
                        type="text"
                        size="small"
                        icon={<ShareAltOutlined />}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/orders/${order.id}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            message.success('Ссылка скопирована');
                          } catch {
                            message.error('Не удалось скопировать ссылку');
                          }
                        }}
                      />
                    </Tooltip>
                  </div>
                  <div className={styles.budgetText}>
                    {Number.isFinite(Number(order.budget)) ? formatCurrency(Number(order.budget)) : 'Договорная'}
                  </div>
                </div>
              </div>

              <Paragraph 
                ellipsis={{ rows: 2 }}
                style={{ color: '#666', marginBottom: 16 }}
              >
                {order.description}
              </Paragraph>

              {/* Прикрепленные файлы */}
              {order.files && order.files.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                    Прикрепленные файлы ({order.files.length}):
                  </Text>
                  <Space size={8} wrap>
                    {order.files.map((file) => {
                      // Определяем иконку по расширению файла
                      const getFileIcon = (filename: string) => {
                        const ext = filename.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
                        if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
                        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
                        if (['zip', 'rar', '7z'].includes(ext || '')) return <FileZipOutlined style={{ color: '#fa8c16' }} />;
                        return <FileOutlined style={{ color: '#666' }} />;
                      };
                      const fileName = file.filename || 'file';

                      return (
                        <Tooltip
                          key={String(file.id ?? fileName)}
                          title={`Открыть ${fileName} (${file.file_size || 'размер неизвестен'})`}
                        >
                          <Tag 
                            icon={getFileIcon(fileName)}
                            className={styles.fileTag}
                            onClick={() => {
                              handleDownloadOrderFile(order.id, file);
                            }}
                          >
                            {fileName} <DownloadOutlined style={{ marginLeft: 4 }} />
                          </Tag>
                        </Tooltip>
                      );
                    })}
                  </Space>
                </div>
              )}

              <Space size={16} wrap style={{ marginBottom: 16 }}>
                <Space size={4}>
                  <ClockCircleOutlined style={{ color: '#999' }} />
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {order.deadline ? dayjs(order.deadline).fromNow() : 'Не указан'}
                  </Text>
                </Space>
                {order.created_at && (
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Создан {dayjs(order.created_at).fromNow()}
                  </Text>
                )}
                <Space size={4}>
                  <UserOutlined style={{ color: '#999' }} />
                  <Text 
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 600,
                      color: (order.bids?.length || order.responses_count || 0) === 0 ? '#999' : 
                             (order.bids?.length || order.responses_count || 0) > 5 ? '#ff4d4f' : '#52c41a'
                    }}
                  >
                    {order.bids?.length || order.responses_count || 0}
                  </Text>
                </Space>
              </Space>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <Space size={10}>
                  <Avatar 
                    size={48}
                    src={order.client?.avatar || order.client_avatar || userProfile?.avatar}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 14 }}>
                      {order.client?.username || order.client_name || 
                       (order.client?.first_name && order.client?.last_name 
                         ? `${order.client.first_name} ${order.client.last_name}` 
                         : userProfile?.username || 'Заказчик')}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Заказов: {order.client_orders_count || 1}
                    </Text>
                  </div>
                </Space>
                <Space size={8}>
                  {isOrderOwner(order) ? (
                    <Button 
                      danger
                      icon={<DeleteOutlined />}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем переход к деталям
                        if (window.confirm('Вы уверены, что хотите удалить этот заказ?')) {
                          handleDeleteOrder(order.id);
                        }
                      }}
                    >
                      Удалить
                    </Button>
                  ) : userProfile?.role === 'expert' ? (
                    <Button 
                      type={hasMyBid ? 'default' : 'primary'}
                      disabled={hasMyBid || checkingMyBid}
                      className={`${styles.actionButton} ${styles.bidButton}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем переход к деталям
                        if (hasMyBid || checkingMyBid) return;
                        setSelectedOrderForBid(order);
                        setBidModalVisible(true);
                      }}
                    >
                      {hasMyBid ? 'Вы уже откликнулись на этот заказ' : checkingMyBid ? 'Проверяем...' : 'Откликнуться'}
                    </Button>
                  ) : null}
                </Space>
              </div>
            </Card>
          );
          })}
        </div>
      )}

            {/* Кнопка создания для мобильных */}
            {isMobile && (
              <Button 
                type="primary" 
                size="large"
                block
                onClick={() => navigate('/create-order')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 12,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  marginBottom: 16
                }}
              >
                Создать заказ
              </Button>
            )}

      {selectedOrderForBid && (
        <BidModal
          visible={bidModalVisible}
          onClose={() => {
            setBidModalVisible(false);
            setSelectedOrderForBid(null);
          }}
          orderId={selectedOrderForBid.id}
          orderTitle={selectedOrderForBid.title}
          orderBudget={Number.isFinite(Number(selectedOrderForBid.budget)) ? Number(selectedOrderForBid.budget) : undefined}
        />
      )}
    </div>
  );
};

export default OrdersFeed;
