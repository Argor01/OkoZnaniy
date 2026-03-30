import React from 'react';
import { Avatar, Badge, Typography, Dropdown, MenuProps, message } from 'antd';
import { UserOutlined, PushpinOutlined, PushpinFilled, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { ChatListItem as ChatListItemType } from '@/features/support/api/chat';
import { getMediaUrl } from '@/config/api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './MessageModalNew.module.css';

const { Text } = Typography;

interface ChatListItemProps {
  chat: ChatListItemType;
  isSelected: boolean;
  isMobile: boolean;
  onClick: () => void;
  onTogglePin?: (chatId: number) => void;
  onMarkAsUnread?: (chatId: number) => void;
}

const formatTimestamp = (dateString: string) => {
  try {
    const result = formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    return result
      .replace(/меньше минуты/gi, '1 м')
      .replace(/(\d+)\s+минут(?:а|ы|у)?/gi, '$1 м');
  } catch {
    return dateString;
  }
};

export const ChatListItemComponent: React.FC<ChatListItemProps> = ({
  chat,
  isSelected,
  isMobile,
  onClick,
  onTogglePin,
  onMarkAsUnread,
}) => {
  const handleTogglePin = () => {
    if (onTogglePin) {
      onTogglePin(chat.id);
      message.success(chat.is_pinned ? 'Чат откреплён' : 'Чат закреплён');
    }
  };

  const handleMarkAsUnread = () => {
    if (onMarkAsUnread) {
      onMarkAsUnread(chat.id);
      message.success('Чат помечен как непрочитанный');
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'pin',
      icon: chat.is_pinned ? <PushpinFilled /> : <PushpinOutlined />,
      label: chat.is_pinned ? 'Открепить' : 'Закрепить',
      onClick: handleTogglePin,
    },
    {
      key: 'unread',
      icon: chat.unread_count > 0 ? <EyeOutlined /> : <EyeInvisibleOutlined />,
      label: chat.unread_count > 0 ? 'Пометить прочитанным' : 'Пометить непрочитанным',
      onClick: handleMarkAsUnread,
      disabled: chat.unread_count === 0 && chat.is_read !== false,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
    >
      <div
        onClick={onClick}
        className={`${styles.chatListItem} ${isMobile ? styles.chatListItemMobile : ''} ${isSelected ? styles.chatListItemSelected : ''} ${chat.unread_count > 0 ? styles.chatListItemUnread : ''} ${chat.is_pinned ? styles.chatListItemPinned : ''}`}
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
              <Badge
                dot
                className={styles.chatBadge}
              />
            )}
          </div>
        </div>
      </div>
    </Dropdown>
  );
};
