import React from 'react';
import { Input, Avatar, Typography, Badge, Dropdown, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  MessageOutlined,
  UserOutlined,
  PushpinOutlined,
  PushpinFilled,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { getMediaUrl } from '../../../../config/api';
import { formatTimestamp } from './utils/messageHelpers';
import type { ChatListItem, ChatDetail } from './types';
import styles from '../MessageModalNew.module.css';

const { Text } = Typography;

interface ChatSidebarProps {
  isMobile: boolean;
  isTablet: boolean;
  selectedChat: ChatDetail | null;
  filteredChats: ChatListItem[];
  showChatListLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectChat: (chatId: number) => void;
  onTogglePin: (chatId: number) => void;
  onMarkAsUnread: (chatId: number) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isMobile,
  isTablet,
  selectedChat,
  filteredChats,
  showChatListLoading,
  searchQuery,
  onSearchQueryChange,
  onSelectChat,
  onTogglePin,
  onMarkAsUnread,
}) => {
  return (
    <div
      className={`${styles.chatSidebar} ${isMobile ? styles.chatSidebarMobile : isTablet ? styles.chatSidebarTablet : styles.chatSidebarDesktop} ${selectedChat && isMobile ? styles.chatSidebarHidden : ''}`}
    >
      <div className={`${styles.chatSearchHeader} ${isMobile ? styles.chatSearchHeaderMobile : ''}`}>
        <Input
          prefix={<SearchOutlined className={`${styles.chatSearchIcon} ${isMobile ? styles.chatSearchIconMobile : ''}`} />}
          placeholder={isMobile ? 'Поиск...' : 'Поиск пользователя'}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className={`${styles.chatSearchInput} ${isMobile ? styles.chatSearchInputMobile : ''}`}
          size={isMobile ? 'small' : 'middle'}
        />
      </div>

      <div className={styles.chatList}>
        {showChatListLoading ? (
          <div className={styles.chatListLoading}>
            <Spin />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className={`${styles.chatListEmpty} ${isMobile ? styles.chatListEmptyMobile : ''}`}>
            <MessageOutlined className={`${styles.chatListEmptyIcon} ${isMobile ? styles.chatListEmptyIconMobile : ''}`} />
            {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const menuItems: MenuProps['items'] = [
              {
                key: 'pin',
                icon: chat.is_pinned ? <PushpinFilled /> : <PushpinOutlined />,
                label: chat.is_pinned ? 'Открепить' : 'Закрепить',
                onClick: () => onTogglePin(chat.id),
              },
              {
                key: 'unread',
                icon: chat.unread_count > 0 ? <EyeOutlined /> : <EyeInvisibleOutlined />,
                label: chat.unread_count > 0 ? 'Пометить прочитанным' : 'Пометить непрочитанным',
                onClick: () => onMarkAsUnread(chat.id),
              },
            ];

            const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
              e.preventDefault();
              e.stopPropagation();
            };

            return (
              <Dropdown
                key={chat.id}
                menu={{ items: menuItems }}
                trigger={['contextMenu']}
              >
                <div
                  onClick={() => onSelectChat(chat.id)}
                  onContextMenu={handleContextMenu}
                  className={`${styles.chatListItem} ${isMobile ? styles.chatListItemMobile : ''} ${selectedChat?.id === chat.id ? styles.chatListItemSelected : ''} ${chat.unread_count > 0 ? styles.chatListItemUnread : ''} ${chat.is_pinned ? styles.chatListItemPinned : ''}`}
                >
                  {chat.is_pinned && (
                    <PushpinFilled className={styles.chatListItemPinIcon} />
                  )}
                  <Avatar
                    size={isMobile ? 36 : 40}
                    icon={<UserOutlined />}
                    src={getMediaUrl(chat.other_user?.avatar)}
                    className={styles.chatAvatar}
                  />
                  <div className={`${styles.chatListContent} ${isMobile ? styles.chatListContentMobile : ''}`}>
                    <div className={styles.chatListHeaderRow}>
                      <Text
                        strong
                        ellipsis
                        className={`${styles.chatListName} ${isMobile ? styles.chatListNameMobile : ''} ${chat.unread_count > 0 ? styles.chatListNameUnread : ''}`}
                      >
                        {chat.other_user?.username || 'Пользователь'}
                      </Text>
                      <Text type="secondary" className={`${styles.chatListTime} ${isMobile ? styles.chatListTimeMobile : ''}`}>
                        {chat.last_message ? formatTimestamp(chat.last_message.created_at) : ''}
                      </Text>
                    </div>
                    <div className={styles.chatListMetaRow}>
                      <Text
                        ellipsis
                        className={`${styles.chatListPreview} ${isMobile ? styles.chatListPreviewMobile : styles.chatListPreviewDesktop} ${chat.unread_count > 0 ? styles.chatListPreviewUnread : ''}`}
                      >
                        {chat.last_message?.text || 'Нет сообщений'}
                      </Text>
                      {chat.unread_count > 0 && (
                        <Badge dot className={styles.chatBadge} />
                      )}
                    </div>
                  </div>
                </div>
              </Dropdown>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
