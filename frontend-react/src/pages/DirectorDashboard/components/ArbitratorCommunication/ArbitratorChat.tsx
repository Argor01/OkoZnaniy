import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { directorApi } from '../../api/directorApi';
import type { GetMessagesParams, InternalMessage, Claim } from '../../api/types';
import ArbitratorMessageList from './ArbitratorMessageList';
import ArbitratorMessageForm from './ArbitratorMessageForm';
import { authApi } from '../../../../api/auth';
import styles from './ArbitratorChat.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface ArbitratorChatProps {
  claimId?: number;
}

const ArbitratorChat: React.FC<ArbitratorChatProps> = ({ claimId }) => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState<number | undefined>(claimId);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyToMessage, setReplyToMessage] = useState<InternalMessage | null>(null);
  const messageFormRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  
  const params: GetMessagesParams = {
    page: currentPage,
    page_size: pageSize,
    claim_id: selectedClaimId,
    unread_only: false,
  };

  
  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ['director-messages', params],
    queryFn: () => directorApi.getMessages(params),
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
    refetchInterval: 10000, 
    retry: false,
    retryOnMount: false,
  });

  
  const { data: claimsData } = useQuery({
    queryKey: ['director-claims', 'for-messages'],
    queryFn: () => directorApi.getPendingApprovalClaims(),
    select: (data) => {
      if (data) return data;
      return [];
    },
    retry: false,
    retryOnMount: false,
  });

  const messages = messagesData?.results || [];
  const claims = (claimsData || []) as Claim[];

  
  const filteredMessages = searchText
    ? messages.filter((msg) =>
        msg.text.toLowerCase().includes(searchText.toLowerCase())
      )
    : messages;

  
  const handleReply = (message: InternalMessage) => {
    setReplyToMessage(message);
    setSelectedClaimId(message.claim_id);
    
    setTimeout(() => {
      if (messageFormRef.current) {
        const rect = messageFormRef.current.getBoundingClientRect();
        window.scrollTo({
          top: rect.top + window.scrollY - 100,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => directorApi.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-messages'] });
      setReplyToMessage(null);
      message.success('Сообщение успешно отправлено');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка при отправке сообщения');
    },
  });

  const handleMessageSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['director-messages'] });
    setReplyToMessage(null);
  };

  const handleClaimClick = (claimId: number) => {
    setSelectedClaimId(claimId);
  };

  const isMobile = window.innerWidth <= 840;

  return (
    <div>
      <Card
        className={[
          styles.rootCard,
          isMobile ? styles.rootCardMobile : '',
        ].filter(Boolean).join(' ')}
      >
        <Space
          direction="vertical"
          size={isMobile ? 'middle' : 'large'}
          className={styles.contentStack}
        >
          <div>
            <Title 
              level={4}
              className={[
                styles.headerTitle,
                isMobile ? styles.headerTitleMobile : '',
              ].filter(Boolean).join(' ')}
            >
              Внутренняя коммуникация
            </Title>
            <Text 
              type="secondary"
              className={[
                styles.headerSubtitle,
                isMobile ? styles.headerSubtitleMobile : '',
              ].filter(Boolean).join(' ')}
            >
              Общение с сотрудниками по вопросам согласования решений и других вопросов
            </Text>
          </div>

          <Divider className={isMobile ? styles.dividerMobile : styles.divider} />

          <div
            className={[
              styles.filtersCard,
              isMobile ? styles.filtersCardMobile : '',
            ].filter(Boolean).join(' ')}
          >
            <Input
              placeholder={isMobile ? "Поиск..." : "Поиск по сообщениям..."}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={styles.searchInput}
              size={isMobile ? 'middle' : 'large'}
              allowClear
            />
            <Select
              placeholder="Фильтр по обращению"
              className={styles.claimSelect}
              size={isMobile ? 'middle' : 'large'}
              value={selectedClaimId}
              onChange={(value) => setSelectedClaimId(value)}
              allowClear
            >
              {claims.map((claim) => (
                <Option key={claim.id} value={claim.id}>
                  #{claim.id} - {claim.order.title}
                </Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
              size={isMobile ? 'middle' : 'large'}
              className={isMobile ? styles.refreshButtonMobile : styles.refreshButton}
            >
              Обновить
            </Button>
          </div>

          <Divider className={isMobile ? styles.dividerMobile : styles.divider} />

          <div 
            className={[
              styles.messagesArea,
              isMobile ? styles.messagesAreaMobile : '',
            ].filter(Boolean).join(' ')}
          >
            {isLoading ? (
              <div className={[
                styles.loadingState,
                isMobile ? styles.loadingStateMobile : '',
              ].filter(Boolean).join(' ')}>
                <Spin size="large" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <Empty
                description="Нет сообщений"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <ArbitratorMessageList
                messages={filteredMessages}
                currentUserId={currentUser?.id}
                onReply={handleReply}
                onClaimClick={handleClaimClick}
              />
            )}
          </div>

          <Divider className={isMobile ? styles.dividerMobile : styles.divider} />

          <div ref={messageFormRef}>
            <ArbitratorMessageForm
              onSuccess={handleMessageSuccess}
              claimId={selectedClaimId}
              claims={claims.map((c) => ({ id: c.id, title: c.order.title }))}
              replyTo={
                replyToMessage
                  ? {
                      text: replyToMessage.text,
                      sender: replyToMessage.sender.username,
                    }
                  : undefined
              }
            />
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ArbitratorChat;

