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
import { directorApi } from '@/features/director/api/directorApi';
import type { Claim } from '@/features/director/api/types';
import styles from './ArbitratorCommunication.module.css';

type ArbitratorCommunicationTab = 'chat' | 'approvals';

const { Title, Text } = Typography;

const ArbitratorCommunication: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ArbitratorCommunicationTab>('chat');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const isMobile = window.innerWidth <= 840;

  
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
        <span className={styles.tabLabel}>
          <MessageOutlined className={isMobile ? styles.tabIconMobile : styles.tabIcon} /> 
          {isMobile ? 'Чат' : 'Внутренний чат'}
        </span>
      ),
      children: <ArbitratorChat />,
    },
    {
      key: 'approvals',
      label: (
        <span className={styles.tabLabel}>
          <FileTextOutlined className={isMobile ? styles.tabIconMobile : styles.tabIcon} /> 
          {isMobile ? `Согласование (${claims.length})` : `Обращения на согласовании (${claims.length})`}
        </span>
      ),
      children: (
        <div>
          <Card
            className={[
              styles.approvalsCard,
              isMobile ? styles.approvalsCardMobile : '',
            ].filter(Boolean).join(' ')}
          >
            <Title 
              level={4}
              className={[
                styles.approvalsTitle,
                isMobile ? styles.approvalsTitleMobile : '',
              ].filter(Boolean).join(' ')}
            >
              Обращения, отправленные на согласование
            </Title>
            <Text 
              type="secondary"
              className={[
                styles.approvalsSubtitle,
                isMobile ? styles.approvalsSubtitleMobile : '',
              ].filter(Boolean).join(' ')}
            >
              Список обращений, отправленных на согласование дирекции
            </Text>
            {claims.length === 0 ? (
              <div className={[
                styles.emptyState,
                isMobile ? styles.emptyStateMobile : '',
              ].filter(Boolean).join(' ')}>
                <Empty
                  description="Нет обращений на согласовании"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <div className={[
                styles.claimsList,
                isMobile ? styles.claimsListMobile : '',
              ].filter(Boolean).join(' ')}>
                {claims.map((claim) => (
                  <Card
                    key={claim.id}
                    className={[
                      styles.claimCard,
                      isMobile ? styles.claimCardMobile : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleViewClaim(claim)}
                    hoverable
                  >
                    <div className={[
                      styles.claimHeader,
                      isMobile ? styles.claimHeaderMobile : '',
                    ].filter(Boolean).join(' ')}>
                      <div className={[
                        styles.claimMain,
                        isMobile ? styles.claimMainMobile : '',
                      ].filter(Boolean).join(' ')}>
                        <Space direction="vertical" size="small" className={styles.claimMetaSpace}>
                          <div className={styles.claimTitleRow}>
                            <Text strong className={[
                              styles.claimTitle,
                              isMobile ? styles.claimTitleMobile : '',
                            ].filter(Boolean).join(' ')}>
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
                            className={[
                              styles.claimOrderTitle,
                              isMobile ? styles.claimOrderTitleMobile : '',
                            ].filter(Boolean).join(' ')}
                          >
                            {claim.order.title || 'Без названия'}
                          </Text>
                          <Space 
                            direction={isMobile ? 'vertical' : 'horizontal'}
                            size="small"
                            className={[
                              styles.claimInfoSpace,
                              isMobile ? styles.claimInfoSpaceMobile : '',
                            ].filter(Boolean).join(' ')}
                          >
                            <Text type="secondary" className={[
                              styles.claimInfoText,
                              isMobile ? styles.claimInfoTextMobile : '',
                            ].filter(Boolean).join(' ')}>
                              <ClockCircleOutlined /> Отправлено:{' '}
                              {dayjs(claim.created_at).format('DD.MM.YYYY HH:mm')}
                            </Text>
                            {claim.decision?.created_at && (
                              <Text type="secondary" className={[
                                styles.claimInfoText,
                                isMobile ? styles.claimInfoTextMobile : '',
                              ].filter(Boolean).join(' ')}>
                                Решение принято:{' '}
                                {dayjs(claim.decision.created_at).format('DD.MM.YYYY HH:mm')}
                              </Text>
                            )}
                          </Space>
                          {claim.decision?.reasoning && (
                            <div className={[
                              styles.claimDecisionBox,
                              isMobile ? styles.claimDecisionBoxMobile : '',
                            ].filter(Boolean).join(' ')}>
                              <Text type="secondary" className={[
                                styles.claimDecisionText,
                                isMobile ? styles.claimDecisionTextMobile : '',
                              ].filter(Boolean).join(' ')}>
                                <strong>Обоснование:</strong> {claim.decision.reasoning}
                              </Text>
                            </div>
                          )}
                          {claim.decision?.approval_comment && (
                            <div className={[
                              styles.claimDecisionBox,
                              isMobile ? styles.claimDecisionBoxMobile : '',
                            ].filter(Boolean).join(' ')}>
                              <Text type="secondary" className={[
                                styles.claimDecisionText,
                                isMobile ? styles.claimDecisionTextMobile : '',
                              ].filter(Boolean).join(' ')}>
                                Комментарий: {claim.decision.approval_comment}
                              </Text>
                            </div>
                          )}
                        </Space>
                      </div>
                      <div className={[
                        styles.claimStatusWrap,
                        isMobile ? styles.claimStatusWrapMobile : '',
                      ].filter(Boolean).join(' ')}>
                        {claim.decision?.approval_status === 'pending' && (
                          <Tag
                            color="orange"
                            icon={<ClockCircleOutlined />}
                            className={[
                              styles.claimStatusTag,
                              isMobile ? styles.claimStatusTagMobile : '',
                            ].filter(Boolean).join(' ')}
                          >
                            Ожидает решения
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'approved' && (
                          <Tag
                            color="green"
                            icon={<CheckCircleOutlined />}
                            className={[
                              styles.claimStatusTag,
                              isMobile ? styles.claimStatusTagMobile : '',
                            ].filter(Boolean).join(' ')}
                          >
                            Согласовано
                          </Tag>
                        )}
                        {claim.decision?.approval_status === 'rejected' && (
                          <Tag
                            color="red"
                            icon={<CloseCircleOutlined />}
                            className={[
                              styles.claimStatusTag,
                              isMobile ? styles.claimStatusTagMobile : '',
                            ].filter(Boolean).join(' ')}
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
        className={[
          styles.rootCard,
          isMobile ? styles.rootCardMobile : '',
        ].filter(Boolean).join(' ')}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ArbitratorCommunicationTab)}
          items={tabItems}
          size={isMobile ? 'middle' : 'large'}
          className={styles.tabs}
        />
      </Card>
    </div>
  );
};

export default ArbitratorCommunication;

