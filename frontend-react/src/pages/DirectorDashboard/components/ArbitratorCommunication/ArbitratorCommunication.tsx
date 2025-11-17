import React, { useState } from 'react';
import { Tabs, Card, Tag, Typography, Space, Empty } from 'antd';
import {
  MessageOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import ArbitratorChat from './ArbitratorChat';
import { directorApi } from '../../api/directorApi';
import type { Claim } from '../../api/types';

type ArbitratorCommunicationTab = 'chat' | 'approvals';

const { Title, Text } = Typography;

const ArbitratorCommunication: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ArbitratorCommunicationTab>('chat');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Получение списка обращений, отправленных на согласование
  const { data: claimsData } = useQuery({
    queryKey: ['director-claims', 'pending_approval'],
    queryFn: () => directorApi.getPendingApprovalClaims(),
    retry: false,
    retryOnMount: false,
  });

  const claims = (claimsData || []) as Claim[];

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsVisible(true);
  };

  const handleDetailsClose = () => {
    setDetailsVisible(false);
    setSelectedClaim(null);
  };

  const tabItems = [
    {
      key: 'chat',
      label: (
        <span>
          <MessageOutlined /> Чат с арбитрами
        </span>
      ),
      children: <ArbitratorChat />,
    },
    {
      key: 'approvals',
      label: (
        <span>
          <FileTextOutlined /> Обращения на согласовании ({claims.length})
        </span>
      ),
      children: (
        <div>
          <Card>
            <Title level={4}>Обращения, отправленные на согласование</Title>
            <Text type="secondary">
              Список обращений, отправленных арбитрами на согласование дирекции
            </Text>
            {claims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Empty
                  description="Нет обращений на согласовании"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {claims.map((claim) => (
                  <Card
                    key={claim.id}
                    style={{ marginBottom: 16, cursor: 'pointer' }}
                    onClick={() => handleViewClaim(claim)}
                    hoverable
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>
                              Обращение #{claim.id}
                            </Text>
                            <Tag
                              color={
                                claim.type === 'refund'
                                  ? 'blue'
                                  : claim.type === 'dispute'
                                  ? 'orange'
                                  : 'red'
                              }
                              style={{ marginLeft: 8 }}
                            >
                              {claim.type === 'refund'
                                ? 'Возврат средств'
                                : claim.type === 'dispute'
                                ? 'Арбитраж'
                                : 'Конфликт'}
                            </Tag>
                          </div>
                          <Text type="secondary">
                            {claim.order.title || 'Без названия'}
                          </Text>
                          <Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <ClockCircleOutlined /> Отправлено:{' '}
                              {dayjs(claim.created_at).format('DD.MM.YYYY HH:mm')}
                            </Text>
                            {claim.decision?.created_at && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Решение принято:{' '}
                                {dayjs(claim.decision.created_at).format('DD.MM.YYYY HH:mm')}
                              </Text>
                            )}
                          </Space>
                          {claim.decision?.reasoning && (
                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <strong>Обоснование:</strong> {claim.decision.reasoning}
                              </Text>
                            </div>
                          )}
                          {claim.decision?.approval_comment && (
                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Комментарий: {claim.decision.approval_comment}
                              </Text>
                            </div>
                          )}
                        </Space>
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        {claim.decision?.approval_status === 'pending' && (
                          <Tag
                            color="orange"
                            icon={<ClockCircleOutlined />}
                            style={{ fontSize: '14px', padding: '4px 12px' }}
                          >
                            Ожидает решения
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'approved' && (
                          <Tag
                            color="green"
                            icon={<CheckCircleOutlined />}
                            style={{ fontSize: '14px', padding: '4px 12px' }}
                          >
                            Согласовано
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'rejected' && (
                          <Tag
                            color="red"
                            icon={<CloseCircleOutlined />}
                            style={{ fontSize: '14px', padding: '4px 12px' }}
                          >
                            Отклонено
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ArbitratorCommunicationTab)}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default ArbitratorCommunication;

