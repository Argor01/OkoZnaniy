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
  const isMobile = window.innerWidth <= 840;

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
        <span style={{ whiteSpace: 'nowrap' }}>
          <MessageOutlined style={{ marginRight: isMobile ? 4 : 8 }} /> 
          {isMobile ? 'Чат' : 'Чат с арбитрами'}
        </span>
      ),
      children: <ArbitratorChat />,
    },
    {
      key: 'approvals',
      label: (
        <span style={{ whiteSpace: 'nowrap' }}>
          <FileTextOutlined style={{ marginRight: isMobile ? 4 : 8 }} /> 
          {isMobile ? `Согласование (${claims.length})` : `Обращения на согласовании (${claims.length})`}
        </span>
      ),
      children: (
        <div>
          <Card
            style={{
              borderRadius: isMobile ? 8 : 12,
              border: 'none',
              background: '#fafafa',
            }}
          >
            <Title 
              level={4}
              style={{
                fontSize: isMobile ? 18 : 20,
                marginBottom: isMobile ? 8 : 16,
              }}
            >
              Обращения, отправленные на согласование
            </Title>
            <Text 
              type="secondary"
              style={{
                fontSize: isMobile ? 13 : 14,
                display: 'block',
                marginBottom: isMobile ? 16 : 24,
              }}
            >
              Список обращений, отправленных арбитрами на согласование дирекции
            </Text>
            {claims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: isMobile ? '24px' : '40px' }}>
                <Empty
                  description="Нет обращений на согласовании"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div style={{ marginTop: isMobile ? 12 : 16 }}>
                {claims.map((claim) => (
                  <Card
                    key={claim.id}
                    style={{ 
                      marginBottom: isMobile ? 12 : 16, 
                      cursor: 'pointer',
                      borderRadius: isMobile ? 8 : 12,
                      border: '1px solid #e5e7eb',
                    }}
                    onClick={() => handleViewClaim(claim)}
                    hoverable
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 12 : 0,
                    }}>
                      <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            alignItems: 'center', 
                            gap: 8 
                          }}>
                            <Text strong style={{ fontSize: isMobile ? 15 : 16 }}>
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
                            >
                              {claim.type === 'refund'
                                ? 'Возврат средств'
                                : claim.type === 'dispute'
                                ? 'Арбитраж'
                                : 'Конфликт'}
                            </Tag>
                          </div>
                          <Text 
                            type="secondary"
                            style={{
                              fontSize: isMobile ? 13 : 14,
                            }}
                          >
                            {claim.order.title || 'Без названия'}
                          </Text>
                          <Space 
                            direction={isMobile ? 'vertical' : 'horizontal'}
                            size="small"
                            style={{ width: isMobile ? '100%' : 'auto' }}
                          >
                            <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                              <ClockCircleOutlined /> Отправлено:{' '}
                              {dayjs(claim.created_at).format('DD.MM.YYYY HH:mm')}
                            </Text>
                            {claim.decision?.created_at && (
                              <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                                Решение принято:{' '}
                                {dayjs(claim.decision.created_at).format('DD.MM.YYYY HH:mm')}
                              </Text>
                            )}
                          </Space>
                          {claim.decision?.reasoning && (
                            <div style={{ 
                              marginTop: 8, 
                              padding: isMobile ? '6px' : '8px', 
                              backgroundColor: '#f5f5f5', 
                              borderRadius: isMobile ? 6 : 8,
                            }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                                <strong>Обоснование:</strong> {claim.decision.reasoning}
                              </Text>
                            </div>
                          )}
                          {claim.decision?.approval_comment && (
                            <div style={{ 
                              marginTop: 8, 
                              padding: isMobile ? '6px' : '8px', 
                              backgroundColor: '#f5f5f5', 
                              borderRadius: isMobile ? 6 : 8,
                            }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                                Комментарий: {claim.decision.approval_comment}
                              </Text>
                            </div>
                          )}
                        </Space>
                      </div>
                      <div style={{ marginLeft: isMobile ? 0 : 16, width: isMobile ? '100%' : 'auto' }}>
                        {claim.decision?.approval_status === 'pending' && (
                          <Tag
                            color="orange"
                            icon={<ClockCircleOutlined />}
                            style={{ 
                              fontSize: isMobile ? 12 : 14, 
                              padding: isMobile ? '2px 8px' : '4px 12px',
                              width: isMobile ? '100%' : 'auto',
                              textAlign: 'center',
                            }}
                          >
                            Ожидает решения
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'approved' && (
                          <Tag
                            color="green"
                            icon={<CheckCircleOutlined />}
                            style={{ 
                              fontSize: isMobile ? 12 : 14, 
                              padding: isMobile ? '2px 8px' : '4px 12px',
                              width: isMobile ? '100%' : 'auto',
                              textAlign: 'center',
                            }}
                          >
                            Согласовано
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'rejected' && (
                          <Tag
                            color="red"
                            icon={<CloseCircleOutlined />}
                            style={{ 
                              fontSize: isMobile ? 12 : 14, 
                              padding: isMobile ? '2px 8px' : '4px 12px',
                              width: isMobile ? '100%' : 'auto',
                              textAlign: 'center',
                            }}
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
      <Card
        style={{
          borderRadius: isMobile ? 8 : 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f0f0f0',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ArbitratorCommunicationTab)}
          items={tabItems}
          size={isMobile ? 'middle' : 'large'}
          tabBarStyle={{
            marginBottom: isMobile ? 16 : 24,
          }}
        />
      </Card>
    </div>
  );
};

export default ArbitratorCommunication;

