/**
 * Таблица запросов клиентов
 */

import React from 'react';
import { Table, Button, Tag, Avatar, Tooltip, Space, Input, Select } from 'antd';
import { EyeOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { CustomerRequest } from '../../types/requests.types';
import { 
  getPriorityColor, 
  getCategoryLabel, 
  getStatusColor,
  formatRequestTime 
} from '../../utils/formatters';
import { 
  REQUEST_PRIORITIES, 
  REQUEST_CATEGORIES, 
  REQUEST_STATUSES,
  REQUEST_PAGINATION_CONFIG 
} from '../../constants/requestConstants';
import styles from './RequestsTable.module.css';

const { Option } = Select;

interface RequestsTableProps {
  requests: CustomerRequest[];
  loading: boolean;
  onRequestClick: (request: CustomerRequest) => void;
  onTakeRequest: (requestId: number) => void;
  isTakingRequest: boolean;
  showTakeAction: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  priorityFilter?: string;
  onPriorityFilterChange?: (priority: string | undefined) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string | undefined) => void;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  loading,
  onRequestClick,
  onTakeRequest,
  isTakingRequest,
  showTakeAction,
  searchQuery = '',
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: CustomerRequest, b: CustomerRequest) => a.id - b.id,
      render: (id: number) => (
        <span className={styles.requestId}>#{id}</span>
      ),
    },
    {
      title: 'Заголовок',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: false, tooltip: true },
      render: (title: string, record: CustomerRequest) => (
        <div className={styles.titleCell}>
          <div className={styles.title}>{title}</div>
          <div className={styles.category}>
            <Tag 
              color={getCategoryLabel(record.category) ? 'blue' : 'default'}
            >
              {getCategoryLabel(record.category)}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Клиент',
      dataIndex: 'customer',
      key: 'customer',
      width: 200,
      render: (customer: CustomerRequest['customer']) => (
        <div className={styles.customerCell}>
          <Avatar 
            src={customer.avatar} 
            icon={<UserOutlined />} 
            size="small"
          />
          <div className={styles.customerInfo}>
            <div className={styles.customerName}>{customer.name}</div>
            <div className={styles.customerEmail}>{customer.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: CustomerRequest['status']) => (
        <Tag color={getStatusColor(status)}>
          {REQUEST_STATUSES[status]}
        </Tag>
      ),
      filters: Object.entries(REQUEST_STATUSES).map(([value, label]) => ({
        text: label,
        value,
      })),
      onFilter: (value: any, record: CustomerRequest) => record.status === value,
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: CustomerRequest['priority']) => (
        <Tag color={getPriorityColor(priority)}>
          {REQUEST_PRIORITIES[priority]}
        </Tag>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      },
      filters: Object.entries(REQUEST_PRIORITIES).map(([value, label]) => ({
        text: label,
        value,
      })),
      onFilter: (value: any, record: CustomerRequest) => record.priority === value,
    },
    {
      title: 'Назначен',
      dataIndex: 'assignedAdmin',
      key: 'assignedAdmin',
      width: 150,
      render: (assignedAdmin: CustomerRequest['assignedAdmin']) => (
        assignedAdmin ? (
          <div className={styles.assignedAdmin}>
            <Avatar 
              src={assignedAdmin.avatar} 
              icon={<UserOutlined />} 
              size="small"
            />
            <span className={styles.adminName}>{assignedAdmin.name}</span>
          </div>
        ) : (
          <span className={styles.unassigned}>Не назначен</span>
        )
      ),
    },
    {
      title: 'Сообщения',
      dataIndex: 'messagesCount',
      key: 'messagesCount',
      width: 100,
      render: (count: number) => (
        <div className={styles.messagesCount}>
          <span className={styles.count}>{count}</span>
        </div>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => a.messagesCount - b.messagesCount,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: string) => (
        <Tooltip title={new Date(createdAt).toLocaleString('ru-RU')}>
          <div className={styles.timeCell}>
            <ClockCircleOutlined />
            <span className={styles.timeText}>
              {formatDistanceToNow(new Date(createdAt), { 
                addSuffix: true, 
                locale: ru 
              })}
            </span>
          </div>
        </Tooltip>
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Последнее сообщение',
      dataIndex: 'lastMessageAt',
      key: 'lastMessageAt',
      width: 140,
      render: (lastMessageAt: string | undefined) => (
        lastMessageAt ? (
          <Tooltip title={new Date(lastMessageAt).toLocaleString('ru-RU')}>
            <div className={styles.timeCell}>
              <span className={styles.timeText}>
                {formatRequestTime(lastMessageAt)}
              </span>
            </div>
          </Tooltip>
        ) : (
          <span className={styles.noMessages}>Нет сообщений</span>
        )
      ),
      sorter: (a: CustomerRequest, b: CustomerRequest) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return aTime - bTime;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: CustomerRequest) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onRequestClick(record)}
            size="small"
            className={styles.actionButton}
          >
            Открыть
          </Button>
          {showTakeAction && !record.assignedAdmin && (
            <Button
              type="primary"
              size="small"
              loading={isTakingRequest}
              onClick={() => onTakeRequest(record.id)}
              className={styles.takeButton}
            >
              Взять
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Фильтры над таблицей
  const tableHeader = (
    <div className={styles.tableHeader}>
      <div className={styles.filters}>
        {onSearchChange && (
          <Input
            placeholder="Поиск по заголовку, описанию, клиенту..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
            allowClear
          />
        )}
        
        {onPriorityFilterChange && (
          <Select
            placeholder="Приоритет"
            value={priorityFilter}
            onChange={onPriorityFilterChange}
            className={styles.filterSelect}
            allowClear
          >
            {Object.entries(REQUEST_PRIORITIES).map(([value, label]) => (
              <Option key={value} value={value}>
                <Tag color={getPriorityColor(value)}>
                  {label}
                </Tag>
              </Option>
            ))}
          </Select>
        )}
        
        {onCategoryFilterChange && (
          <Select
            placeholder="Категория"
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            className={styles.filterSelect}
            allowClear
          >
            {Object.entries(REQUEST_CATEGORIES).map(([value, label]) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        )}
      </div>
      
      <div className={styles.tableInfo}>
        <span className={styles.totalCount}>
          Всего запросов: {requests.length}
        </span>
      </div>
    </div>
  );

  return (
    <div className={styles.tableContainer}>
      {tableHeader}
      
      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey="id"
        pagination={{
          ...REQUEST_PAGINATION_CONFIG,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} из ${total} запросов`,
        }}
        className={styles.table}
        scroll={{ x: 1200 }}
        size="middle"
        rowClassName={(record) => {
          // Выделяем срочные запросы
          if (record.priority === 'urgent') {
            return styles.urgentRow;
          }
          // Выделяем непрочитанные запросы
          if (record.messagesCount === 0) {
            return styles.newRow;
          }
          return '';
        }}
      />
    </div>
  );
};