import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './ComplaintDetails.module.css';
import { 
  Typography, Tag, Avatar, Space, Spin, Empty, Divider, Modal, Card,
  Input, Button, Upload, message as antMessage
} from 'antd';
import { 
  ArrowLeftOutlined, UserOutlined, StarFilled,
  CheckCircleOutlined, CloseCircleOutlined, HourglassOutlined,
  FileTextOutlined, FileImageOutlined, FileZipOutlined, DollarOutlined, BookOutlined, ClockCircleOutlined,
  DownloadOutlined, MessageOutlined, SendOutlined, PaperClipOutlined, NumberOutlined, ReadOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { complaintsApi, Complaint } from '../api/complaints';
import { ordersApi } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import { AppButton, AppCard } from '@/components/ui';
import { formatCurrency } from '@/utils/formatters';

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG: Record<Complaint['status'], { 
  color: string; 
  icon: React.ReactNode; 
  label: string 
}> = {
  open: { color: 'green', icon: <HourglassOutlined />, label: 'Открыт' },
  in_progress: { color: 'blue', icon: <HourglassOutlined />, label: 'В работе' },
  resolved: { color: 'cyan', icon: <CheckCircleOutlined />, label: 'Решён' },
  closed: { color: 'default', icon: <CloseCircleOutlined />, label: 'Закрыт' },
};

const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  not_completed: 'Заказ не выполнен',
  poor_quality: 'Заказ выполнен некачественно',
  not_paid: 'Заказ не оплачен',
  unjustified_review: 'Необоснованный отзыв',
  ready_works_shop: 'Магазин готовых работ',
  other: 'Другое',
};

const FINANCIAL_LABELS: Record<string, string> = {
  prepayment_refund: 'Возврат предоплаты',
  prepayment_refund_plus_penalty: 'Возврат предоплаты и неустойка',
  no_refund: 'Возврат не требуется',
};

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
  is_mine: boolean;
}

const ComplaintDetails: React.FC = () => {
  const { complaintId } = useParams<{ complaintId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeResolution, setCloseResolution] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Прокрутка чата к последнему сообщению
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  const { data: complaint, isLoading, error, isError } = useQuery<Complaint>({
    queryKey: ['complaint', complaintId],
    queryFn: async () => {
      try {
        const result = await complaintsApi.getById(Number(complaintId));
        console.log('Complaint loaded:', result);
        return result;
      } catch (err: any) {
        console.error('Error loading complaint:', err);
        console.error('Error status:', err?.response?.status);
        console.error('Error data:', err?.response?.data);
        throw err;
      }
    },
    enabled: !!complaintId,
    retry: 1,
  });

  // Заказ уже приходит в данных претензии, отдельный запрос не нужен
  const order = complaint?.order;

  const closeComplaintMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: number; resolution: string }) => {
      return await complaintsApi.close(id, resolution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      antMessage.success('Претензия закрыта');
    },
    onError: (error: any) => {
      antMessage.error(error?.response?.data?.detail || 'Не удалось закрыть претензию');
    },
  });

  const handleCloseComplaint = () => {
    if (!complaint || !closeResolution.trim()) return;
    closeComplaintMutation.mutate({ id: complaint.id, resolution: closeResolution.trim() });
    setShowCloseModal(false);
    setCloseResolution('');
  };

  const currentUserId = userProfile?.id;
  const isPlaintiff = currentUserId === complaint?.plaintiff_id;
  const isDefendant = currentUserId === complaint?.defendant_id;
  const canClose = (isPlaintiff || isDefendant) && complaint?.status === 'open';

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spin size="large" tip="Загрузка претензии..." />
      </div>
    );
  }

  if (isError || !complaint) {
    const errorMessage = (error as any)?.response?.status === 404
      ? 'Претензия не найдена или у вас нет доступа к ней'
      : 'Ошибка загрузки претензии';
    
    return (
      <div className={styles.notFound}>
        <Title level={3}>{errorMessage}</Title>
        <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
          {(error as any)?.message || 'Проверьте URL или обратитесь в поддержку'}
        </Text>
        <AppButton variant="primary" onClick={() => navigate('/arbitration')}>
          Вернуться к арбитражу
        </AppButton>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[complaint.status];

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !complaint) return;
    
    setSendingMessage(true);
    try {
      // TODO: Реализовать отправку сообщения через API
      const newMessage: ChatMessage = {
        id: Date.now(),
        sender_id: userProfile?.id || 0,
        sender_name: userProfile?.username || 'Вы',
        text: chatInput.trim(),
        created_at: new Date().toISOString(),
        is_mine: true,
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');
      antMessage.success('Сообщение отправлено');
    } catch (err: any) {
      antMessage.error(err?.response?.data?.detail || 'Не удалось отправить сообщение');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <AppButton 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/arbitration')}
          className={styles.backButton}
          size={isMobile ? 'middle' : 'large'}
        >
          Назад
        </AppButton>

        {/* Заголовок */}
        <div className={styles.header}>
          <Space wrap size={12}>
            {canClose && (
              <AppButton 
                variant="secondary"
                onClick={() => setShowCloseModal(true)}
                loading={closeComplaintMutation.isPending}
              >
                Закрыть претензию
              </AppButton>
            )}
          </Space>
        </div>

        <AppCard className={styles.mainCard}>
          <div className={styles.mainCardInner}>
            <Title level={2} className={styles.pageTitle}>
              Претензия №{complaint.id}
            </Title>

            <div className={styles.orderInfoSection}>
              <div className={styles.partiesGridWrapper}>
                {/* Истец */}
                <AppCard className={styles.partyGlassCard}>
                  <div className={styles.partyGlassInner}>
                    <Avatar 
                      size={56} 
                      src={complaint.plaintiff?.avatar} 
                      icon={<UserOutlined />}
                      className={styles.partyAvatar}
                    />
                    <div className={styles.partyMeta}>
                      <Text strong className={styles.partyNameLink}>
                        {complaint.plaintiff?.first_name && complaint.plaintiff?.last_name 
                          ? `${complaint.plaintiff.first_name} ${complaint.plaintiff.last_name}`
                          : complaint.plaintiff?.username || 'Истец'}
                      </Text>
                      <div className={styles.partySubline}>
                        <span className={styles.partyRolePill}>
                          {complaint.plaintiff?.id === userProfile?.id ? 'Вы' : 'Заказчик'}
                        </span>
                        <span className={styles.partyLabelPill}>Истец</span>
                      </div>
                    </div>
                  </div>
                </AppCard>

                {/* Ответчик */}
                <AppCard className={styles.partyGlassCard}>
                  <div className={styles.partyGlassInner}>
                    <Avatar 
                      size={56} 
                      src={complaint.defendant?.avatar} 
                      icon={<UserOutlined />}
                      className={styles.partyAvatar}
                    />
                    <div className={styles.partyMeta}>
                      <Text strong className={styles.partyNameLink}>
                        {complaint.defendant?.first_name && complaint.defendant?.last_name 
                          ? `${complaint.defendant.first_name} ${complaint.defendant.last_name}`
                          : complaint.defendant?.username || 'Ответчик'}
                      </Text>
                      <div className={styles.partySubline}>
                        <span className={styles.partyRolePill}>
                          {complaint.defendant?.id === userProfile?.id ? 'Вы' : 'Исполнитель'}
                        </span>
                        <span className={styles.partyLabelPill}>Ответчик</span>
                      </div>
                    </div>
                  </div>
                </AppCard>
              </div>

              <div className={styles.expertOfferGrid}>
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconBlue}`}>
                    <NumberOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Объект спора</div>
                    <div className={styles.expertOfferValue}>Заказ №{complaint.order_id}</div>
                  </div>
                </div>
                
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconPurple}`}>
                    <BookOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Предмет</div>
                    <div className={styles.expertOfferValue}>
                      {order?.subject?.name || 'Не указан'}
                    </div>
                  </div>
                </div>
                
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconOrange}`}>
                    <ReadOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Тип работы</div>
                    <div className={styles.expertOfferValue}>
                      {order?.work_type?.name || 'Не указан'}
                    </div>
                  </div>
                </div>
                
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconDefault}`}>
                    <ClockCircleOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Дата подачи</div>
                    <div className={styles.expertOfferValue}>{new Date(complaint.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                </div>
                
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconGreen}`}>
                    <DollarOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Стоимость заказа</div>
                    <div className={styles.expertOfferValue}>
                      {order?.budget ? formatCurrency(Number(order.budget)) : 'Договорная'}
                    </div>
                  </div>
                </div>
                
                <div className={styles.expertOfferGridItem}>
                  <div className={`${styles.expertOfferGridIcon} ${styles.expertOfferGridIconDefault}`}>
                    <DatabaseOutlined />
                  </div>
                  <div>
                    <div className={styles.expertOfferLabel}>Статус претензии</div>
                    <div className={styles.expertOfferValue}>{statusConfig.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Divider className={styles.sectionDivider} />

          <div className={styles.contentSection}>

            {/* Детали претензии */}
            <div>
              <Title level={4} className={styles.sectionTitle}>Детали претензии</Title>
              
              <div className={styles.detailsGrid}>
                <div className={styles.detailCard}>
                  <div className={styles.detailCardLabel}>Тип</div>
                  <div className={styles.detailCardValue}>
                    {COMPLAINT_TYPE_LABELS[complaint.complaint_type] || complaint.complaint_type}
                  </div>
                </div>
                
                <div className={styles.detailCard}>
                  <div className={styles.detailCardLabel}>Актуальность</div>
                  <div className={styles.detailCardValue}>
                    <Tag color={complaint.is_order_relevant ? 'green' : 'default'}>
                      {complaint.is_order_relevant ? 'Актуален' : 'Не актуален'}
                    </Tag>
                    {complaint.relevant_until && (
                      <Text type="secondary" className={styles.relevantDate}>
                        <br />
                        до {new Date(complaint.relevant_until).toLocaleDateString('ru-RU')}
                      </Text>
                    )}
                  </div>
                </div>
                
                <div className={styles.detailCard}>
                  <div className={styles.detailCardLabel}>Финансовые требования</div>
                  <div className={styles.detailCardValue}>
                    {FINANCIAL_LABELS[complaint.financial_requirement] || complaint.financial_requirement}
                    {complaint.refund_percent && (
                      <Text type="secondary" className={styles.refundPercent}>
                        <br />({complaint.refund_percent}%)
                      </Text>
                    )}
                  </div>
                </div>
                
                <div className={styles.detailCard}>
                  <div className={styles.detailCardLabel}>Дата создания</div>
                  <div className={styles.detailCardValue}>
                    {new Date(complaint.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>

              <Divider />

              <div className={styles.descriptionSection}>
                <Title level={5} className={styles.descriptionTitle}>Описание</Title>
                <Paragraph className={styles.description}>{complaint.description}</Paragraph>
              </div>

              {complaint.files && complaint.files.length > 0 && (
                <div className={styles.orderFilesSection}>
                  <Title level={5} className={styles.sectionTitle}>Файлы</Title>
                  <div className={styles.orderFilesGrid}>
                    {complaint.files.map((file) => {
                      const fileExt = file.file_name.split('.').pop()?.toLowerCase() || '';
                      let iconClass = styles.fileIconDefault;
                      let IconComponent = FileTextOutlined;
                      
                      if (fileExt === 'pdf') {
                        iconClass = styles.fileIconPdf;
                      } else if (['doc', 'docx'].includes(fileExt)) {
                        iconClass = styles.fileIconDoc;
                      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                        IconComponent = FileImageOutlined;
                        iconClass = styles.fileIconImage;
                      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExt)) {
                        IconComponent = FileZipOutlined;
                        iconClass = styles.fileIconArchive;
                      }
                      
                      return (
                        <a 
                          key={file.id} 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.orderFileTile}
                        >
                          <div className={`${styles.orderFileIconBox} ${iconClass}`}>
                            <IconComponent style={{ fontSize: '24px' }} />
                          </div>
                          <div className={styles.orderFileName}>{file.file_name}</div>
                          <DownloadOutlined className={styles.orderFileDownloadIcon} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {complaint.resolution && (
                <div className={`${styles.resolutionSection} ${complaint.status === 'resolved' ? styles.resolutionResolved : styles.resolutionClosed}`}>
                  <Title level={5} className={styles.resolutionTitle}>Резолюция</Title>
                  <Paragraph className={styles.resolution}>{complaint.resolution}</Paragraph>
                </div>
              )}
            </div>
          </div>
        </AppCard>

        {/* Чат арбитража - встроенный снизу */}
        {(complaint.status === 'open' || complaint.status === 'in_progress') && (
          <AppCard className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <Title level={4} className={styles.chatTitle}>
                <MessageOutlined className={styles.chatTitleIcon} />
                Чат арбитража
              </Title>
              <Text type="secondary" className={styles.chatSubtitle}>
                {complaint.status === 'open' ? 'Общение между сторонами спора' : 'Чат в работе'}
              </Text>
            </div>

            <div className={styles.chatMessages}>
              {chatMessages.length === 0 ? (
                <Empty 
                  description="Сообщений пока нет. Начните обсуждение претензии." 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`${styles.chatMessage} ${msg.is_mine ? styles.chatMessageMine : styles.chatMessageTheirs}`}
                  >
                    <div className={styles.chatMessageAvatar}>
                      <Avatar size={32} icon={<UserOutlined />} />
                    </div>
                    <div className={styles.chatMessageContent}>
                      <div className={styles.chatMessageHeader}>
                        <Text strong className={styles.chatMessageSender}>{msg.sender_name}</Text>
                        <Text type="secondary" className={styles.chatMessageTime}>
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </div>
                      <Text className={styles.chatMessageText}>{msg.text}</Text>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.chatInputWrapper}>
              <div className={styles.chatInputRow}>
                <Upload showUploadList={false}>
                  <Button icon={<PaperClipOutlined />} className={styles.attachButton} />
                </Upload>
                <Input.TextArea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Напишите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
                  className={styles.chatInput}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={sendingMessage || complaint.status === 'closed' || complaint.status === 'resolved'}
                />
                <AppButton
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sendingMessage}
                  disabled={!chatInput.trim() || complaint.status === 'closed' || complaint.status === 'resolved'}
                  className={styles.sendButton}
                >
                  {isMobile ? '' : 'Отправить'}
                </AppButton>
              </div>
        </div>
          </AppCard>
        )}

        {/* Модалка закрытия претензии */}
        <Modal
          title="Закрыть претензию"
          open={showCloseModal}
          onCancel={() => {
            setShowCloseModal(false);
            setCloseResolution('');
          }}
          onOk={handleCloseComplaint}
          okText="Закрыть"
          cancelText="Отмена"
          okButtonProps={{
            loading: closeComplaintMutation.isPending,
            disabled: !closeResolution.trim(),
          }}
          width={isMobile ? '100%' : 600}
          centered
        >
          <div style={{ padding: '16px 0' }}>
            <Typography.Paragraph>
              Вы действительно хотите закрыть претензию №{complaint?.id}? Это действие разморозит заказ.
            </Typography.Paragraph>
            <Typography.Text strong>Резолюция:</Typography.Text>
            <Input.TextArea
              value={closeResolution}
              onChange={(e) => setCloseResolution(e.target.value)}
              placeholder="Введите резолюцию по закрытию претензии"
              rows={4}
              style={{ marginTop: 8 }}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ComplaintDetails;
