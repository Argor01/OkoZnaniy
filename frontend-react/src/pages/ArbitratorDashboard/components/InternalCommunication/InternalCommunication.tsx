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
import DirectorChat from './DirectorChat';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim } from '../../api/types';
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';

type InternalCommunicationTab = 'chat' | 'approvals';

const { Title, Text } = Typography;

const InternalCommunication: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InternalCommunicationTab>('chat');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  
  const { data: claimsData } = useQuery({
    queryKey: ['arbitrator-claims', 'pending_approval'],
    queryFn: () => arbitratorApi.getClaims({ status: 'pending_approval', page_size: 50 }),
    select: (data) => {
      if (data?.results) return data.results;
      return [];
    },
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
          <MessageOutlined /> Чат с дирекцией
        </span>
      ),
      children: <DirectorChat />,
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
            <Title level={4}>Обращения, отправленные на согласование дирекции</Title>
            <Text type="secondary">
              Список обращений, отправленных на согласование дирекции
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
                          {claim.decision?.approval_comment && (
                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Комментарий дирекции: {claim.decision.approval_comment}
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
          onChange={(key) => setActiveTab(key as InternalCommunicationTab)}
          items={tabItems}
          size="large"
        />
      </Card>

      {selectedClaim && (
        <ClaimDetails
          claim={selectedClaim}
          visible={detailsVisible}
          onClose={handleDetailsClose}
        />
      )}
    </div>
  );
};

export default InternalCommunication;
