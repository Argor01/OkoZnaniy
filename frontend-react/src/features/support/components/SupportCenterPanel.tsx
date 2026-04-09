import React from 'react';
import { Alert, Button, Card, Empty, Input, List, Segmented, Space, Spin, Tag, Typography, message } from 'antd';
import {
  ArrowLeftOutlined,
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
};

const priorityMeta: Record<string, { color: string; label: string }> = {
  low: { color: 'green', label: 'Низкий' },
  medium: { color: 'gold', label: 'Средний' },
  high: { color: 'orange', label: 'Высокий' },
  urgent: { color: 'red', label: 'Срочный' },
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
        if (!prev) return data[0] ?? null;
        return data.find((item) => item.id === prev.id && item.type === prev.type) ?? data[0] ?? null;
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
    if (!active) return;
    void loadItems();
  }, [active, loadItems]);

  React.useEffect(() => {
    if (!active || !selectedItem) {
      setActivity(null);
      return;
    }
    void loadActivity(selectedItem);
  }, [active, selectedItem, loadActivity]);

  const visibleItems = React.useMemo(() => {
    if (selectedType === 'all') return items;
    return items.filter((item) => item.type === selectedType);
  }, [items, selectedType]);

  const goToForm = (mode: 'support' | 'arbitration') => {
    if (onNavigateToForm) {
      onNavigateToForm(mode);
      return;
    }
    navigate(`/support/claim-form?mode=${mode}`);
  };

  const handleSendReply = async () => {
    if (!selectedItem || !reply.trim()) return;
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

    if (!activity?.feed?.length) {
      return <Empty description="История обращения пока пуста" />;
    }

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {activity.feed.map((item) => {
          if (item.kind === 'message') {
            const author = `${item.sender?.first_name ?? ''} ${item.sender?.last_name ?? ''}`.trim() || 'Пользователь';
            return (
              <Card key={item.id} size="small" bodyStyle={{ padding: 12 }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space size={8} wrap>
                    <Text strong>{author}</Text>
                    {item.is_admin ? <Tag color="blue">Поддержка</Tag> : <Tag>Вы</Tag>}
                    <Text type="secondary">
                      {new Date(item.created_at).toLocaleString('ru-RU')}
                    </Text>
                  </Space>
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {item.text}
                  </Paragraph>
                </Space>
              </Card>
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

  const selectedStatus = selectedItem ? statusMeta[selectedItem.status] ?? { color: 'default', label: selectedItem.status } : null;
  const selectedPriority = selectedItem ? priorityMeta[selectedItem.priority] ?? { color: 'default', label: selectedItem.priority } : null;

  return (
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
                const priority = priorityMeta[item.priority] ?? { color: 'default', label: item.priority };
                const isSelected = selectedItem?.id === item.id && selectedItem.type === item.type;

                return (
                  <List.Item
                    style={{
                      borderRadius: 12,
                      padding: 12,
                      cursor: 'pointer',
                      background: isSelected ? '#f0f5ff' : '#fff',
                      border: `1px solid ${isSelected ? '#adc6ff' : '#f0f0f0'}`,
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                        <Space wrap>
                          <Text strong>{item.subject}</Text>
                          <Tag color={item.type === 'claim' ? 'volcano' : 'blue'}>
                            {item.type === 'claim' ? 'Арбитраж' : 'Обращение'}
                          </Tag>
                        </Space>
                        <Text type="secondary">#{item.ticket_number}</Text>
                      </Space>

                      <Space wrap>
                        <Tag color={status.color}>{status.label}</Tag>
                        <Tag color={priority.color}>{priority.label}</Tag>
                        {item.order?.id ? <Tag icon={<MessageOutlined />}>Заказ #{item.order.id}</Tag> : null}
                      </Space>

                      <Text type="secondary">
                        Обновлено {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ru })}
                      </Text>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </Space>
      </Card>

      {selectedItem ? (
        <Card>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
              <Space direction="vertical" size={4}>
                <Space wrap>
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setSelectedItem(null)}
                    style={{ paddingInline: 0 }}
                  >
                    К списку
                  </Button>
                  <Tag color={selectedItem.type === 'claim' ? 'volcano' : 'blue'}>
                    {selectedItem.type === 'claim' ? 'Арбитраж' : 'Обращение'}
                  </Tag>
                </Space>
                <Title level={4} style={{ margin: 0 }}>{selectedItem.subject}</Title>
                <Text type="secondary">#{selectedItem.ticket_number}</Text>
              </Space>
              <Space wrap>
                {selectedStatus ? <Tag color={selectedStatus.color}>{selectedStatus.label}</Tag> : null}
                {selectedPriority ? <Tag color={selectedPriority.color}>{selectedPriority.label}</Tag> : null}
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

            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                {selectedItem.description}
              </Paragraph>
            </Card>

            {renderFeed()}

            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Text strong>Комментарий к обращению</Text>
                <Input.TextArea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  autoSize={{ minRows: 3, maxRows: 6 }}
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
        </Card>
      ) : null}
    </div>
  );
};

export default SupportCenterPanel;
