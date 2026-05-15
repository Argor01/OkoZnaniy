import React from 'react';
import { List, Badge, Tag, Typography, Input, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ChatRoom } from './types';

const { Text } = Typography;
const { Search } = Input;

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  searchText: string;
  loading: boolean;
  onSearch: (text: string) => void;
  onSelectRoom: (room: ChatRoom) => void;
  getRoomTypeColor?: (type: string) => string;
  getRoomTypeText?: (type: string) => string;
  extra?: React.ReactNode;
}

const defaultTypeColors: Record<string, string> = {
  general: 'purple',
  department: 'green',
  project: 'orange',
  private: 'purple',
};

const defaultTypeTexts: Record<string, string> = {
  general: 'Общий',
  department: 'Отдел',
  project: 'Проект',
  private: 'Личный',
};

const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  selectedRoom,
  searchText,
  loading,
  onSearch,
  onSelectRoom,
  getRoomTypeColor = (type) => defaultTypeColors[type] || 'gray',
  getRoomTypeText = (type) => defaultTypeTexts[type] || type,
  extra,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border-secondary, #f0f0f0)' }}>
        <Search
          placeholder="Поиск чатов..."
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
        />
        {extra}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : rooms.length === 0 ? (
          <Empty description="Нет чатов" style={{ padding: 32 }} />
        ) : (
          <List
            dataSource={rooms}
            renderItem={(room) => (
              <List.Item
                key={room.id}
                onClick={() => onSelectRoom(room)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  background: selectedRoom?.id === room.id ? 'var(--color-chat-item-active, #f3e8ff)' : undefined,
                }}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge count={room.unread_count} size="small">
                        <Text strong>{room.name}</Text>
                      </Badge>
                      <Tag color={getRoomTypeColor(room.type)} style={{ fontSize: 10 }}>
                        {getRoomTypeText(room.type)}
                      </Tag>
                    </div>
                  }
                  description={
                    room.last_message ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {room.last_message.sender.first_name}: {room.last_message.text?.slice(0, 50)}
                        {room.last_message.text && room.last_message.text.length > 50 ? '...' : ''}
                        <span style={{ float: 'right' }}>
                          {dayjs(room.last_message.sent_at).format('HH:mm')}
                        </span>
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {room.description || 'Нет сообщений'}
                      </Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default ChatRoomList;
