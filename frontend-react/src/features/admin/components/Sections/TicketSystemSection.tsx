import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import apiClient from '@/api/client';
import { useTicket, useTicketActions, useTickets } from '@/features/admin/hooks';
import styles from './TicketSystemSection.module.css';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

interface TicketRow {
  id: number;
  ticket_number: string;
  type: 'support_request' | 'claim';
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  status: 'open' | 'in_progress' | 'completed' | 'new' | 'pending_approval';
  auto_created?: boolean;
  tags_list?: string[];
  created_at: string;
}

interface TicketDetail extends TicketRow {
  description?: string;
  reason?: string;
  defendant?: { id?: number; first_name?: string; last_name?: string } | null;
  messages?: Array<{
    id: number;
    sender?: {
      first_name?: string;
      last_name?: string;
    };
    message: string;
    is_admin?: boolean;
    created_at: string;
  }>;
}

export const TicketSystemSection: React.FC = () => {
  const { tickets: rawTickets = [], loading, refetch } = useTickets(true);
  const { sendMessage: sendTicketMessage, updateStatus: updateTicketStatus } = useTicketActions();
  const tickets = rawTickets as unknown as TicketRow[];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [contactActionLoading, setContactActionLoading] = useState(false);
  const [contactBanPeriodModalVisible, setContactBanPeriodModalVisible] = useState(false);
  const [contactBanUntil, setContactBanUntil] = useState<Dayjs | null>(null);

  const { ticket: rawTicket, loading: detailLoading, refetch: refetchTicket } = useTicket(selectedTicketId ?? 0);
  const selectedTicket = rawTicket as TicketDetail | undefined;

  useEffect(() => {
    if (!detailsOpen) {
      setReplyText('');
    }
  }, [detailsOpen]);

  const openTicket = (ticket: TicketRow) => {
    setSelectedTicketId(ticket.id);
    setDetailsOpen(true);
  };

  const closeTicket = () => {
    setDetailsOpen(false);
    setSelectedTicketId(null);
    setReplyText('');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'orange',
      new: 'orange',
      in_progress: 'blue',
      completed: 'green',
      pending_approval: 'purple',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Открыт',
      new: 'Новый',
      in_progress: 'В работе',
      completed: 'Завершен',
      pending_approval: 'Ожидает одобрения',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      open: <ExclamationCircleOutlined />,
      new: <ExclamationCircleOutlined />,
      in_progress: <ClockCircleOutlined />,
      completed: <CheckCircleOutlined />,
      pending_approval: <ClockCircleOutlined />,
    };
    return icons[status as keyof typeof icons] || <FileTextOutlined />;
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return dateString;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (ticket.type === 'claim') return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (ticket.subject || '').toLowerCase().includes(query) ||
        (ticket.user.first_name || '').toLowerCase().includes(query) ||
        (ticket.user.last_name || '').toLowerCase().includes(query) ||
        ticket.ticket_number.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;

    return true;
  });

  const ticketStats = {
    total: tickets.filter((ticket) => ticket.type !== 'claim').length,
    open: tickets.filter((ticket) => ticket.type !== 'claim' && (ticket.status === 'open' || ticket.status === 'new')).length,
    inProgress: tickets.filter((ticket) => ticket.type !== 'claim' && ticket.status === 'in_progress').length,
    completed: tickets.filter((ticket) => ticket.type !== 'claim' && ticket.status === 'completed').length,
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setSending(true);
      await sendTicketMessage(selectedTicket.id, replyText, selectedTicket.type);
      setReplyText('');
      await Promise.all([refetch(), refetchTicket()]);
      message.success('Ответ отправлен');
    } catch {
      message.error('Не удалось отправить ответ');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: 'in_progress' | 'completed') => {
    if (!selectedTicket) return;
    try {
      setUpdatingStatus(true);
      await updateTicketStatus(selectedTicket.id, status, selectedTicket.type);
      await Promise.all([refetch(), refetchTicket()]);
      message.success(status === 'completed' ? 'Обращение закрыто' : 'Обращение взято в работу');
    } catch {
      message.error('Не удалось обновить статус');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const columns = [
    {
      title: 'Номер',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      width: 120,
      render: (text: string) => <Text strong>#{text}</Text>,
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      width: 320,
      render: (text: string, record: TicketRow) => (
        <div>
          <div>{text}</div>
          {record.auto_created ? <Tag color="blue" style={{ marginTop: 4 }}>Из чата</Tag> : null}
        </div>
      ),
    },
    {
      title: 'Клиент',
      key: 'client',
      width: 180,
      render: (record: TicketRow) => (
        <Space>
          <Avatar size={24} icon={<UserOutlined />} />
          <span>{record.user.first_name} {record.user.last_name}</span>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Теги',
      dataIndex: 'tags_list',
      key: 'tags_list',
      width: 170,
      render: (tags: string[]) => (
        tags && tags.length > 0 ? (
          <Space wrap size="small">
            {tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}
            {tags.length > 2 ? <Tag color="default">+{tags.length - 2}</Tag> : null}
          </Space>
        ) : '-'
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatTimestamp(date),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: TicketRow) => (
        <Button
          size="small"
          type="primary"
          onClick={(event) => {
            event.stopPropagation();
            openTicket(record);
          }}
        >
          Открыть обращение
        </Button>
      ),
    },
  ];

  const messages = useMemo(() => selectedTicket?.messages ?? [], [selectedTicket]);

  const isContactViolation = useMemo(() => {
    if (!selectedTicket) return false;
    if (selectedTicket.reason === 'contact_violation') return true;
    const tagList = selectedTicket.tags_list ?? [];
    if (tagList.some((t) => /контакт/i.test(t) || /нарушен/i.test(t))) return true;
    const subject = selectedTicket.subject || '';
    return /обмен.*контакт|Нарушение.*контакт/i.test(subject);
  }, [selectedTicket]);

  const contactViolationUserId = useMemo(() => {
    if (!selectedTicket || !isContactViolation) return null;
    return selectedTicket.defendant?.id ?? selectedTicket.user?.id ?? null;
  }, [selectedTicket, isContactViolation]);

  const contactViolationUserName = useMemo(() => {
    if (!selectedTicket || !isContactViolation) return null;
    const d = selectedTicket.defendant;
    return (
      [d?.first_name, d?.last_name].filter(Boolean).join(' ') ||
      [selectedTicket.user?.first_name, selectedTicket.user?.last_name].filter(Boolean).join(' ') ||
      null
    );
  }, [selectedTicket, isContactViolation]);

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchTicket()]);
  };

  const handleUnfreezeContactChat = async () => {
    if (!contactViolationUserId) return;
    setContactActionLoading(true);
    try {
      await apiClient.post(`/users/${contactViolationUserId}/unfreeze_chats/`);
      message.success('Чат разморожен');
      await refreshAll();
    } catch {
      message.error('Не удалось разморозить чат');
    } finally {
      setContactActionLoading(false);
    }
  };

  const handlePermanentContactBan = async () => {
    if (!contactViolationUserId) return;
    setContactActionLoading(true);
    try {
      await apiClient.patch(`/users/${contactViolationUserId}/ban_for_contacts/`, {
        reason: `Блокировка по обращению ${selectedTicket?.ticket_number || ''}`.trim(),
      });
      message.success(
        contactViolationUserName
          ? `Пользователь ${contactViolationUserName} заблокирован`
          : 'Пользователь заблокирован'
      );
      await refreshAll();
    } catch {
      message.error('Не удалось заблокировать пользователя');
    } finally {
      setContactActionLoading(false);
    }
  };

  const handlePeriodContactBan = async () => {
    if (!contactViolationUserId || !contactBanUntil) return;
    const diffInHours = contactBanUntil.diff(dayjs(), 'hour', true);
    const days = Math.max(1, Math.ceil(diffInHours / 24));

    setContactActionLoading(true);
    try {
      await apiClient.patch(`/users/${contactViolationUserId}/ban_for_contacts/`, {
        days,
        reason: `Временная блокировка по обращению ${selectedTicket?.ticket_number || ''}`.trim(),
      });
      message.success(
        contactViolationUserName
          ? `Пользователь ${contactViolationUserName} заблокирован на период`
          : 'Пользователь заблокирован на период'
      );
      setContactBanPeriodModalVisible(false);
      setContactBanUntil(null);
      await refreshAll();
    } catch {
      message.error('Не удалось заблокировать пользователя на период');
    } finally {
      setContactActionLoading(false);
    }
  };

  return (
    <div className={styles.ticketSystemWrapper}>
      <div style={{ width: '100%' }}>
        <Card
          title={<div className={styles.ticketSystemTitleRow}><FileTextOutlined className={styles.ticketSystemTitleIcon} /><span>Обращения</span></div>}
          extra={<Button type="text" icon={<ReloadOutlined />} loading={loading} size="small" onClick={() => refetch()} />}
        >
          <div className={styles.ticketSystemStatsGrid}>
            <div className={styles.ticketSystemStatItem}><div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatTotal}`}>{ticketStats.total}</div><div className={styles.ticketSystemStatLabel}>Всего</div></div>
            <div className={styles.ticketSystemStatItem}><div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatOpen}`}>{ticketStats.open}</div><div className={styles.ticketSystemStatLabel}>Открыто</div></div>
            <div className={styles.ticketSystemStatItem}><div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatInProgress}`}>{ticketStats.inProgress}</div><div className={styles.ticketSystemStatLabel}>В работе</div></div>
            <div className={styles.ticketSystemStatItem}><div className={`${styles.ticketSystemStatValue} ${styles.ticketSystemStatCompleted}`}>{ticketStats.completed}</div><div className={styles.ticketSystemStatLabel}>Завершено</div></div>
          </div>

          <Input
            prefix={<SearchOutlined />}
            placeholder="Поиск по номеру, теме или клиенту..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.ticketSystemSearch}
            allowClear
          />

          <div className={styles.ticketSystemFiltersRow}>
            <Select value={statusFilter} onChange={setStatusFilter} className={styles.ticketSystemFilterSelect} size="small">
              <Option value="all">Все статусы</Option>
              <Option value="open">Открыт</Option>
              <Option value="new">Новый</Option>
              <Option value="in_progress">В работе</Option>
              <Option value="completed">Завершен</Option>
            </Select>
          </div>

          <Table
            columns={columns}
            dataSource={filteredTickets}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} обращений` }}
            locale={{ emptyText: <Empty description="Нет обращений" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            scroll={{ x: 1100 }}
            size="small"
            onRow={(record) => ({ onClick: () => openTicket(record), style: { cursor: 'pointer' } })}
          />
        </Card>
      </div>

      <Modal title={selectedTicket ? `Обращение #${selectedTicket.ticket_number}` : 'Обращение'} open={detailsOpen} onCancel={closeTicket} footer={null} width={860} destroyOnClose>
        {detailLoading || !selectedTicket ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
              <Space direction="vertical" size={4}>
                <Title level={4} style={{ margin: 0 }}>{selectedTicket.subject}</Title>
                <Text type="secondary">{selectedTicket.user.first_name} {selectedTicket.user.last_name} · {selectedTicket.user.email}</Text>
              </Space>
              <Tag color={getStatusColor(selectedTicket.status)} icon={getStatusIcon(selectedTicket.status)}>{getStatusText(selectedTicket.status)}</Tag>
            </Space>

            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Описание">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{selectedTicket.description || 'Описание не заполнено'}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Создано">{new Date(selectedTicket.created_at).toLocaleString('ru-RU')}</Descriptions.Item>
              {selectedTicket.tags_list && selectedTicket.tags_list.length > 0 ? (
                <Descriptions.Item label="Теги">
                  <Space wrap>{selectedTicket.tags_list.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <Card size="small" title="Переписка">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {messages.length === 0 ? (
                  <Empty description="Сообщений пока нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  messages.map((item) => {
                    const author = `${item.sender?.first_name ?? ''} ${item.sender?.last_name ?? ''}`.trim() || 'Пользователь';
                    return (
                      <Card key={item.id} size="small" styles={{ body: { padding: 12 } }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space wrap>
                            <Text strong>{author}</Text>
                            {item.is_admin ? <Tag color="blue">Админ</Tag> : <Tag>Клиент</Tag>}
                            <Text type="secondary">{new Date(item.created_at).toLocaleString('ru-RU')}</Text>
                          </Space>
                          <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{item.message}</Paragraph>
                        </Space>
                      </Card>
                    );
                  })
                )}
              </Space>
            </Card>

            <Card size="small" title="Действия">
              <Space wrap>
                <Button onClick={() => handleStatusChange('in_progress')} disabled={selectedTicket.status === 'in_progress' || selectedTicket.status === 'completed'} loading={updatingStatus}>Взять в работу</Button>
                <Button type="primary" onClick={() => handleStatusChange('completed')} disabled={selectedTicket.status === 'completed'} loading={updatingStatus}>Закрыть обращение</Button>
              </Space>
              {isContactViolation && contactViolationUserId ? (
                <>
                  <div style={{ marginTop: 12, marginBottom: 4 }}>
                    <Text strong>Нарушение: обмен контактными данными в чате</Text>
                  </div>
                  <Space wrap>
                    <Button
                      icon={<MessageOutlined />}
                      loading={contactActionLoading}
                      onClick={handleUnfreezeContactChat}
                    >
                      Разморозить чат
                    </Button>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={contactActionLoading}
                      onClick={handlePermanentContactBan}
                    >
                      Заблокировать пользователя
                    </Button>
                    <Button
                      loading={contactActionLoading}
                      onClick={() => setContactBanPeriodModalVisible(true)}
                    >
                      Заблокировать на период
                    </Button>
                  </Space>
                </>
              ) : null}
            </Card>

            <Card size="small" title="Ответ клиенту">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input.TextArea value={replyText} onChange={(event) => setReplyText(event.target.value)} autoSize={{ minRows: 4, maxRows: 8 }} placeholder="Введите ответ по обращению" />
                <div>
                  <Button type="primary" icon={<SendOutlined />} onClick={handleSendReply} loading={sending} disabled={!replyText.trim()}>Отправить</Button>
                </div>
              </Space>
            </Card>
          </Space>
        )}
      </Modal>

      <Modal
        title="Заблокировать пользователя на период"
        open={contactBanPeriodModalVisible}
        onOk={handlePeriodContactBan}
        onCancel={() => {
          setContactBanPeriodModalVisible(false);
          setContactBanUntil(null);
        }}
        okText="Заблокировать"
        cancelText="Отмена"
        okButtonProps={{ loading: contactActionLoading, disabled: !contactBanUntil }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Выберите дату и время окончания блокировки{contactViolationUserName ? ` для ${contactViolationUserName}` : ''}.
        </Text>
        <DatePicker
          showTime
          value={contactBanUntil}
          onChange={(value) => setContactBanUntil(value)}
          style={{ width: '100%' }}
          format="DD.MM.YYYY HH:mm"
          disabledDate={(current) => !!current && current < dayjs().startOf('day')}
        />
      </Modal>
    </div>
  );
};
