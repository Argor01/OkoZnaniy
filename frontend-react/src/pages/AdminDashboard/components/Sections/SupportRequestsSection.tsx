import React from 'react';
import { Card, List, Badge, Button, Tag, Avatar, Typography, Empty, Space, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  UserOutlined, 
  MessageOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InboxOutlined 
} from '@ant-design/icons';
import { SupportRequest, SupportStatus } from '../../types/support.types';
import { formatRelativeTime } from '../../utils/formatters';
import styles from './SupportRequestsSection.module.css';

const { Text, Title, Paragraph } = Typography;

interface SupportRequestsSectionProps {
  requests: SupportRequest[];
  loading: boolean;
  selectedStatus: SupportStatus;
  onStatusChange: (status: SupportStatus) => void;
  onRequestClick: (request: SupportRequest) => void;
  onTakeRequest: (requestId: number) => void;
}

export const SupportRequestsSection: React.FC<SupportRequestsSectionProps> = ({
  requests,
  loading,
  selectedStatus,
  onStatusChange,
  onRequestClick,
  onTakeRequest
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'purple';
      case 'billing': return 'gold';
      case 'account': return 'cyan';
      case 'general': return 'default';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technical': return 'Техническая';
      case 'billing': return 'Оплата';
      case 'account': return 'Аккаунт';
      case 'general': return 'Общий';
      default: return category;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'СРОЧНО';
      case 'high': return 'ВЫСОКИЙ';
      case 'medium': return 'СРЕДНИЙ';
      case 'low': return 'НИЗКИЙ';
      default: return priority.toUpperCase();
    }
  };

  const statusTabs = [
    { 
      key: 'open' as SupportStatus, 
      label: 'Открытые запросы', 
      icon: <InboxOutlined />,
      count: requests.filter(r => r.status === 'open').length 
    },
    { 
      key: 'in_progress' as SupportStatus, 
      label: 'В процессе', 
      icon: <ClockCircleOutlined />,
      count: requests.filter(r => r.status === 'in_progress').length 
    },
    { 
      key: 'completed' as SupportStatus, 
      label: 'Выполненные', 
      icon: <CheckCircleOutlined />,
      count: requests.filter(r => r.status === 'completed').length 
    }
  ];

  const filteredRequests = requests.filter(request => request.status === selectedStatus);

  const getEmptyDescription = () => {
    switch (selectedStatus) {
      case 'open': return 'Нет новых запросов';
      case 'in_progress': return 'Нет запросов в работе';
      case 'completed': return 'Нет выполненных запросов';
      default: return 'Нет запросов';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>
          <MessageOutlined className={styles.headerIcon} />
          Поддержка клиентов
        </Title>
        <div className={styles.tabs}>
          {statusTabs.map(tab => (
            <Button
              key={tab.key}
              type={selectedStatus === tab.key ? 'primary' : 'default'}
              onClick={() => onStatusChange(tab.key)}
              className={styles.tabButton}
              icon={tab.icon}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.count > 0 && (
                <Badge 
                  count={tab.count} 
                  className={`${styles.badge} ${selectedStatus === tab.key ? styles.badgeActive : styles.badgeInactive}`}
                />
              )}
            </Button>
          ))}
        </div>
      </div>

      <Card className={styles.requestsList}>
        {filteredRequests.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={getEmptyDescription()}
          />
        ) : (
          <List
            loading={loading}
            dataSource={filteredRequests}
            renderItem={(request) => (
              <List.Item
                className={styles.requestItem}
                onClick={() => onRequestClick(request)}
                actions={[
                  selectedStatus === 'open' && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeRequest(request.id);
                      }}
                    >
                      Взять в работу
                    </Button>
                  ),
                  <Tooltip title="Количество сообщений">
                    <Button type="link" size="small" icon={<MessageOutlined />}>
                      {request.messagesCount}
                    </Button>
                  </Tooltip>
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div className={styles.avatarContainer}>
                      <Avatar
                        src={request.customer.avatar}
                        icon={<UserOutlined />}
                        size="large"
                      />
                      {request.priority === 'urgent' && (
                        <ExclamationCircleOutlined className={styles.urgentIcon} />
                      )}
                    </div>
                  }
                  title={
                    <div className={styles.requestTitle}>
                      <span className={styles.titleText}>{request.title}</span>
                      <div className={styles.tags}>
                        <Tag color={getPriorityColor(request.priority)}>
                          {getPriorityLabel(request.priority)}
                        </Tag>
                        <Tag color={getCategoryColor(request.category)}>
                          {getCategoryLabel(request.category)}
                        </Tag>
                      </div>
                    </div>
                  }
                  description={
                    <div className={styles.requestDescription}>
                      <Paragraph ellipsis={{ rows: 2 }} className={styles.descriptionText}>
                        {request.description}
                      </Paragraph>
                      <div className={styles.requestMeta}>
                        <Space size="middle" wrap>
                          <Text type="secondary">
                            <ClockCircleOutlined /> {formatRelativeTime(request.createdAt)}
                          </Text>
                          <Text type="secondary">
                            <UserOutlined /> {request.customer.name}
                          </Text>
                          {request.assignedAdmin && (
                            <Text type="secondary">
                              Исполнитель: {request.assignedAdmin.name}
                            </Text>
                          )}
                          {request.lastMessageAt && (
                            <Text type="secondary">
                              Последнее сообщение: {formatRelativeTime(request.lastMessageAt)}
                            </Text>
                          )}
                        </Space>
                      </div>
                      {request.tags.length > 0 && (
                        <div className={styles.requestTags}>
                          {request.tags.map(tag => (
                            <Tag key={tag}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
