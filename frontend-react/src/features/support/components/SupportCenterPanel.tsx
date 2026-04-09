import React from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Modal,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  Input,
} from 'antd';
import {
  ClockCircleOutlined,
  CustomerServiceOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supportRequestsApi } from '@/features/support/api/requests';
import type {
  SupportActivityResponse,
  SupportConversation,
  SupportConversationType,
} from '@/features/support/types/requests';

const { Paragraph, Text, Title } = Typography;

const statusMeta: Record<string, { color: string; label: string }> = {
  open: { color: 'orange', label: 'Открыто' },
  new: { color: 'blue', label: 'Новое' },
  in_progress: { color: 'processing', label: 'В работе' },
  completed: { color: 'green', label: 'Решено' },
  pending_approval: { color: 'purple', label: 'Ожидает решения' },
  submitted: { color: 'blue', label: 'Подано' },
  under_review: { color: 'processing', label: 'На рассмотрении' },
  awaiting_response: { color: 'gold', label: 'Ожидает ответа' },
  in_arbitration: { color: 'volcano', label: 'В арбитраже' },
  decision_made: { color: 'cyan', label: 'Решение принято' },
  closed: { color: 'green', label: 'Закрыто' },
  rejected: { color: 'red', label: 'Отклонено' },
};

interface SupportCenterPanelProps {
  active?: boolean;
  compact?: boolean;
  onNavigateToForm?: (mode: 'support' | 'arbitration') => void;
}

export const SupportCenterPanel: React.FC<SupportCenterPanelProps> = ({
  active = true,
  compact = false,
  onNavigateToForm,
}) => {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<SupportConversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedType, setSelectedType] = React.useState<'all' | SupportConversationType>('all');
  const [selectedItem, setSelectedItem] = React.useState<SupportConversation | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [activity, setActivity] = React.useState<SupportActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [reply, setReply] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const loadItems = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await supportRequestsApi.listAll();
      setItems(data);
      setSelectedItem((prev) => {
        if (!prev) {
          return null;
        }

        return data.find((item) => item.id === prev.id && item.type === prev.type) ?? null;
      });
    } catch {
      message.error('Не удалось загрузить обращения');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = React.useCallback(async (item: SupportConversation) => {
    try {
      setActivityLoading(true);
      const data = await supportRequestsApi.getActivity(item.type, item.id);
      setActivity(data);
    } catch {
      message.error('Не удалось загрузить историю обращения');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!active) {
      return;
    }

    void loadItems();
  }, [active, loadItems]);

  React.useEffect(() => {
    if (!active || !detailsOpen || !selectedItem) {
      setActivity(null);
      return;
    }

    void loadActivity(selectedItem);
  }, [active, detailsOpen, selectedItem, loadActivity]);

  const visibleItems = React.useMemo(() => {
    if (selectedType === 'all') {
      return items;
    }

    if (selectedType === 'claim') {
      return items.filter((item) => item.type === 'claim' || item.type === 'arbitration_case');
    }

    return items.filter((item) => item.type === selectedType);
  }, [items, selectedType]);

  const goToForm = (mode: 'support' | 'arbitration') => {
    if (onNavigateToForm) {
      onNavigateToForm(mode);
      return;
    }

    navigate(`/support/claim-form?mode=${mode}`);
  };

  const openDetails = (item: SupportConversation) => {
    setSelectedItem(item);
    setReply('');
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setReply('');
  };

  const handleSendReply = async () => {
    if (!selectedItem || !reply.trim()) {
      return;
    }

    try {
      setSending(true);
      await supportRequestsApi.sendMessage(selectedItem.type, selectedItem.id, reply);
      setReply('');
      await loadActivity(selectedItem);
      await loadItems();
      message.success('Сообщение отправлено');
    } catch {
      message.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const renderFeed = () => {
    if (activityLoading) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin />
        </div>
      );
    }

    const feedItems = activity?.feed?.filter(
      (item) => !(item.kind === 'activity' && item.activity_type === 'message')
    ) ?? [];

      if (!feedItems.length) {
        return <Empty description="История обращения пока пуста" />;
      }

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {feedItems.map((item) => {
          if (item.kind === 'message') {
            const author = `${item.sender?.first_name ?? ''} ${item.sender?.last_name ?? ''}`.trim() || 'Пользователь';
            const isSupportMessage = Boolean(item.is_admin) || item.sender?.role === 'admin';
            const isOrderChat = item.source === 'order_chat';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: isSupportMessage ? 'flex-start' : 'flex-end',
                }}
              >
                <Card
                  size="small"
                  style={{
                    width: 'fit-content',
                    maxWidth: compact ? '100%' : '78%',
                    borderRadius: 16,
                    background: isSupportMessage ? '#eef7ff' : '#fff8e6',
                    borderColor: isSupportMessage ? '#b7dcff' : '#f5d27a',
                  }}
                  styles={{ body: { padding: '12px 14px' } }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space size={8} wrap>
                      <Text strong>{author}</Text>
                      {isOrderChat ? (
                        <Tag color="geekblue">Чат по заказу</Tag>
                      ) : isSupportMessage ? (
                        <Tag color="blue">Поддержка</Tag>
                      ) : (
                        <Tag>Вы</Tag>
                      )}
                      <Text type="secondary">{new Date(item.created_at).toLocaleString('ru-RU')}</Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </Paragraph>
                  </Space>
                </Card>
              </div>
            );
          }

          return (
            <Alert
              key={item.id}
              type="info"
              showIcon
              message={item.text || 'Обновление обращения'}
              description={new Date(item.created_at).toLocaleString('ru-RU')}
            />
          );
        })}
      </div>
    );
  };

  const selectedStatus = selectedItem
    ? statusMeta[selectedItem.status] ?? { color: 'default', label: selectedItem.status }
    : null;

  return (
    <>
      <div style={{ display: 'grid', gap: 16, height: '100%', overflow: 'auto', padding: compact ? 12 : 24 }}>
        <Card>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
              <Space direction="vertical" size={4}>
                <Title level={4} style={{ margin: 0 }}>Центр обращений</Title>
                <Text type="secondary">Все вопросы и арбитраж теперь собраны в одном месте.</Text>
              </Space>
              <Space wrap>
                <Button type="primary" icon={<CustomerServiceOutlined />} onClick={() => goToForm('support')}>
                  Новое обращение
                </Button>
                <Button icon={<ExclamationCircleOutlined />} onClick={() => goToForm('arbitration')}>
                  Жалоба по заказу
                </Button>
              </Space>
            </Space>

            <Segmented
              block
              value={selectedType}
              onChange={(value) => setSelectedType(value as 'all' | SupportConversationType)}
              options={[
                { label: 'Все', value: 'all' },
                { label: 'Обращения', value: 'support_request' },
                { label: 'Арбитраж', value: 'claim' },
              ]}
            />

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Spin />
              </div>
            ) : visibleItems.length === 0 ? (
              <Empty description="Пока нет обращений" />
            ) : (
              <List
                dataSource={visibleItems}
                renderItem={(item) => {
                  const status = statusMeta[item.status] ?? { color: 'default', label: item.status };

                  return (
                    <List.Item style={{ padding: 0, border: 'none', marginBottom: 12 }}>
                      <Card
                        hoverable
                        style={{ width: '100%', borderRadius: 12 }}
                        styles={{ body: { padding: 16 } }}
                        onClick={() => openDetails(item)}
                      >
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                            <Space wrap>
                              <Text strong>{item.subject}</Text>
                              <Tag color={item.type === 'support_request' ? 'blue' : 'volcano'}>
                                {item.type === 'support_request' ? 'Обращение' : 'Арбитраж'}
                              </Tag>
                            </Space>
                            <Text type="secondary">#{item.ticket_number}</Text>
                          </Space>

                          <Space wrap>
                            <Tag color={status.color}>{status.label}</Tag>
                            {item.order?.id ? <Tag icon={<MessageOutlined />}>Заказ #{item.order.id}</Tag> : null}
                          </Space>

                          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                            <Text type="secondary">
                              Обновлено {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ru })}
                            </Text>
                            <Button
                              type="link"
                              style={{ paddingInline: 0 }}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetails(item);
                              }}
                            >
                              Подробнее
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            )}
          </Space>
        </Card>
      </div>

      <Modal
        title={selectedItem ? selectedItem.subject : 'Обращение'}
        open={detailsOpen}
        onCancel={closeDetails}
        footer={null}
        width={compact ? '92vw' : 860}
        centered
        destroyOnClose={false}
      >
        {selectedItem ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Space direction="vertical" size={4}>
                <Space wrap>
                  <Tag color={selectedItem.type === 'support_request' ? 'blue' : 'volcano'}>
                    {selectedItem.type === 'support_request' ? 'Обращение' : 'Арбитраж'}
                  </Tag>
                  <Text type="secondary">#{selectedItem.ticket_number}</Text>
                </Space>
              </Space>
              <Space wrap>
                {selectedStatus ? <Tag color={selectedStatus.color}>{selectedStatus.label}</Tag> : null}
                {selectedItem.order?.id ? <Tag>Заказ #{selectedItem.order.id}</Tag> : null}
              </Space>
            </Space>

            <Alert
              type="info"
              showIcon
              icon={<ClockCircleOutlined />}
              message="Ход решения"
              description="Здесь видны ответы поддержки, изменения статуса и все важные действия по обращению."
            />

            {renderFeed()}

            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Text strong>Ответ по обращению</Text>
                <Input.TextArea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  placeholder="Если нужно, оставьте уточнение для поддержки прямо в обращении."
                />
                <div>
                  <Button
                    type="primary"
                    onClick={handleSendReply}
                    loading={sending}
                    disabled={!reply.trim()}
                  >
                    Отправить сообщение
                  </Button>
                </div>
              </Space>
            </Card>
          </Space>
        ) : null}
      </Modal>
    </>
  );
};

export default SupportCenterPanel;
