import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { arbitratorApi } from '../../api/arbitratorApi';
import type { GetMessagesParams, InternalMessage, Claim } from '../../api/types';
import MessageList from './MessageList';
import MessageForm from './MessageForm';
import ClaimDetails from '../ClaimsProcessing/ClaimDetails';
import { authApi } from '../../../../api/auth';

const { Title, Text } = Typography;
const { Option } = Select;

interface DirectorChatProps {
  claimId?: number;
}

const DirectorChat: React.FC<DirectorChatProps> = ({ claimId }) => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState<number | undefined>(claimId);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyToMessage, setReplyToMessage] = useState<InternalMessage | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimDetailsVisible, setClaimDetailsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    queryKey: ['arbitrator-messages', params],
    queryFn: () => arbitratorApi.getMessages(params),
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
    refetchInterval: 10000, 
  });

  
  const { data: claimsData } = useQuery({
    queryKey: ['arbitrator-claims', 'for-messages'],
    queryFn: () => arbitratorApi.getClaims({ page_size: 100 }),
    select: (data) => {
      if (data?.results) return data.results;
      return [];
    },
  });

  const messages = messagesData?.results || [];
  const claims = (claimsData || []) as Claim[];

  
  const filteredMessages = searchText
    ? messages.filter((msg) =>
        msg.text.toLowerCase().includes(searchText.toLowerCase())
      )
    : messages;


  
  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedClaimId(claimId);
    setCurrentPage(1);
  };

  const handleReply = (message: InternalMessage) => {
    setReplyToMessage(message);
    
    setTimeout(() => {
      if (messageFormRef.current) {
        const element = messageFormRef.current;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 20; 

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const handleMessageSuccess = () => {
    setReplyToMessage(null);
    
    queryClient.invalidateQueries({ queryKey: ['arbitrator-messages'] });
  };

  const handleClaimClick = async (claimId: number) => {
    try {
      
      const claim = await arbitratorApi.getClaim(claimId);
      setSelectedClaim(claim);
      setClaimDetailsVisible(true);
    } catch (error) {
      message.error('Не удалось загрузить информацию об обращении');
    }
  };

  const handleClaimDetailsClose = () => {
    setClaimDetailsVisible(false);
    setSelectedClaim(null);
  };

  const handleDelete = (messageId: number) => {
    refetch();
  };

  
  const claimsForForm = claims.map((claim) => ({
    id: claim.id,
    title: claim.order.title || `Обращение #${claim.id}`,
  }));

  return (
    <div>
      <Card>
        <div className="arbitratorChatHeader">
          <Title level={4} className="arbitratorChatTitle">Чат с дирекцией</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Обновить
          </Button>
        </div>

        <Space direction="vertical" className="arbitratorStackSpace" size="middle">
          <Space wrap>
            <Input
              placeholder="Поиск по тексту сообщений..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              className="arbitratorSearchInput"
            />
            <Select
              placeholder="Фильтр по обращению"
              className="arbitratorClaimSelect"
              value={selectedClaimId}
              onChange={setSelectedClaimId}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {claims.map((claim) => (
                <Option key={claim.id} value={claim.id}>
                  #{claim.id} - {claim.order.title || 'Без названия'}
                </Option>
              ))}
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Поиск
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
              Сбросить
            </Button>
          </Space>
        </Space>

        <Divider />

        <div
          className="arbitratorMessagesContainer"
        >
          {isLoading ? (
            <div className="arbitratorEmptyState">
              <Spin size="large" />
            </div>
          ) : (
            <>
              <MessageList
                messages={filteredMessages}
                currentUserId={currentUser?.id}
                onReply={handleReply}
                onDelete={handleDelete}
                onClaimClick={handleClaimClick}
              />
              {messagesData && messagesData.count > pageSize && (
                <div className="arbitratorMessagesCount">
                  <Text type="secondary">
                    Показано {filteredMessages.length} из {messagesData.count} сообщений
                  </Text>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        
        <Divider />
        <div ref={messageFormRef}>
          <Card size="small" title={replyToMessage ? 'Ответ на сообщение' : 'Новое сообщение'}>
            {replyToMessage && (
              <div className="arbitratorReplyBox">
                <Text type="secondary">
                  Ответ на сообщение от {replyToMessage.sender.username} от{' '}
                  {new Date(replyToMessage.created_at).toLocaleString('ru-RU')}
                </Text>
                <div className="arbitratorReplyText">
                  <Text>{replyToMessage.text}</Text>
                </div>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setReplyToMessage(null)}
                  className="arbitratorReplyCancel"
                >
                  Отменить ответ
                </Button>
              </div>
            )}
            <MessageForm
              claimId={selectedClaimId}
              claims={claimsForForm}
              onSuccess={handleMessageSuccess}
              replyTo={
                replyToMessage
                  ? {
                      text: replyToMessage.text,
                      sender: replyToMessage.sender.username,
                    }
                  : undefined
              }
            />
          </Card>
        </div>
      </Card>

      
      {selectedClaim && (
        <ClaimDetails
          claim={selectedClaim}
          visible={claimDetailsVisible}
          onClose={handleClaimDetailsClose}
        />
      )}
    </div>
  );
};

export default DirectorChat;

