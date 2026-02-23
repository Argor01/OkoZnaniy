import React, { useState } from 'react';
import { Card, Table, Input, Select, Button, Space, Tag, Modal, List, Typography, Avatar, Spin } from 'antd';
import { SearchOutlined, EyeOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface Message {
  id: number;
  sender: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  receiver: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  text: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: number;
  participants: Array<{
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    role: string;
  }>;
  last_message: {
    text: string;
    created_at: string;
  };
  messages_count: number;
  order_id?: number;
  order_title?: string;
}

interface UserConversationsSectionProps {
  conversations: Conversation[];
  loading: boolean;
  onViewConversation: (conversationId: number) => void;
  onLoadMessages?: (conversationId: number) => Promise<Message[]>;
}

export const UserConversationsSection: React.FC<UserConversationsSectionProps> = ({
  conversations,
  loading,
  onViewConversation,
  onLoadMessages,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleViewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setModalVisible(true);
    
    if (onLoadMessages) {
      setMessagesLoading(true);
      try {
        const msgs = await onLoadMessages(conversation.id);
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    }
    
    onViewConversation(conversation.id);
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = searchText
      ? conv.participants.some(
          (p) =>
            p.username.toLowerCase().includes(searchText.toLowerCase()) ||
            p.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            p.last_name?.toLowerCase().includes(searchText.toLowerCase())
        ) || conv.order_title?.toLowerCase().includes(searchText.toLowerCase())
      : true;

    const matchesRole = filterRole !== 'all'
      ? conv.participants.some((p) => p.role === filterRole)
      : true;

    return matchesSearch && matchesRole;
  });

  const columns = [
    {
      title: 'Участники',
      key: 'participants',
      render: (_: any, record: Conversation) => (
        <Space direction="vertical" size="small">
          {record.participants.map((p) => (
            <Space key={p.id}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>
                {p.first_name && p.last_name
                  ? `${p.first_name} ${p.last_name}`
                  : p.username}
              </Text>
              <Tag color={p.role === 'client' ? 'blue' : p.role === 'expert' ? 'green' : 'orange'}>
                {p.role === 'client' ? 'Клиент' : p.role === 'expert' ? 'Эксперт' : p.role}
              </Tag>
            </Space>
          ))}
        </Space>
      ),
    },
    {
      title: 'Заказ',
      dataIndex: 'order_title',
      key: 'order',
      render: (title: string, record: Conversation) =>
        record.order_id ? (
          <Space direction="vertical" size={0}>
            <Text>#{record.order_id}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {title}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Последнее сообщение',
      key: 'last_message',
      render: (_: any, record: Conversation) => (
        <Space direction="vertical" size={0}>
          <Text ellipsis style={{ maxWidth: 300 }}>
            {record.last_message.text}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(record.last_message.created_at).format('DD.MM.YYYY HH:mm')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Сообщений',
      dataIndex: 'messages_count',
      key: 'messages_count',
      align: 'center' as const,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Conversation) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewConversation(record)}
        >
          Просмотр
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card title="Переписки пользователей" extra={<MessageOutlined />}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Input
              placeholder="Поиск по участникам или заказу..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={filterRole}
              onChange={setFilterRole}
              style={{ width: 200 }}
            >
              <Option value="all">Все роли</Option>
              <Option value="client">Клиенты</Option>
              <Option value="expert">Эксперты</Option>
            </Select>
          </Space>

          <Table
            columns={columns}
            dataSource={filteredConversations}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </Space>
      </Card>

      <Modal
        title={
          selectedConversation ? (
            <Space>
              <MessageOutlined />
              <span>
                Переписка{' '}
                {selectedConversation.participants
                  .map((p) =>
                    p.first_name && p.last_name
                      ? `${p.first_name} ${p.last_name}`
                      : p.username
                  )
                  .join(' ↔ ')}
              </span>
            </Space>
          ) : (
            'Переписка'
          )
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedConversation(null);
          setMessages([]);
        }}
        footer={null}
        width={800}
      >
        {messagesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <Text strong>
                        {message.sender.first_name && message.sender.last_name
                          ? `${message.sender.first_name} ${message.sender.last_name}`
                          : message.sender.username}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(message.created_at).format('DD.MM.YYYY HH:mm')}
                      </Text>
                      {!message.is_read && <Tag color="orange">Не прочитано</Tag>}
                    </Space>
                  }
                  description={message.text}
                />
              </List.Item>
            )}
            locale={{ emptyText: 'Нет сообщений' }}
            style={{ maxHeight: '500px', overflow: 'auto' }}
          />
        )}
      </Modal>
    </>
  );
};
