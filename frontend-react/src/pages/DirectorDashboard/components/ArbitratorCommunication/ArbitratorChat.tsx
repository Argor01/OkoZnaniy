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

  // Получение текущего пользователя
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

  // Параметры запроса
  const params: GetMessagesParams = {
    page: currentPage,
    page_size: pageSize,
    claim_id: selectedClaimId,
    unread_only: false,
  };

  // Получение списка сообщений
  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ['director-messages', params],
    queryFn: () => directorApi.getMessages(params),
    select: (data) => {
      if (data?.results) return data;
      return { count: 0, next: null, previous: null, results: [] };
    },
    refetchInterval: 10000, // Обновление каждые 10 секунд
    retry: false,
    retryOnMount: false,
  });

  // Получение списка обращений для фильтрации
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

  // Фильтрация сообщений по поисковому запросу на клиенте
  const filteredMessages = searchText
    ? messages.filter((msg) =>
        msg.text.toLowerCase().includes(searchText.toLowerCase())
      )
    : messages;

  // Обработчик ответа на сообщение
  const handleReply = (message: InternalMessage) => {
    setReplyToMessage(message);
    setSelectedClaimId(message.claim_id);
    // Прокрутка к форме ответа
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

  // Мутация для отправки сообщения
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
        style={{
          borderRadius: isMobile ? 8 : 12,
          border: 'none',
          background: '#fafafa',
        }}
      >
        <Space direction="vertical" size={isMobile ? 'middle' : 'large'} style={{ width: '100%' }}>
          <div>
            <Title 
              level={4}
              style={{
                fontSize: isMobile ? 18 : 20,
                marginBottom: isMobile ? 8 : 16,
              }}
            >
              Коммуникация с арбитрами
            </Title>
            <Text 
              type="secondary"
              style={{
                fontSize: isMobile ? 13 : 14,
              }}
            >
              Общение с арбитрами по вопросам согласования решений и других вопросов
            </Text>
          </div>

          <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }} />

          {/* Фильтры и поиск */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 12 : 16,
              padding: isMobile ? 12 : 16,
              background: '#fff',
              borderRadius: isMobile ? 8 : 12,
              border: '1px solid #e5e7eb',
            }}
          >
            <Input
              placeholder={isMobile ? "Поиск..." : "Поиск по сообщениям..."}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              size={isMobile ? 'middle' : 'large'}
              allowClear
            />
            <Select
              placeholder="Фильтр по обращению"
              style={{ width: '100%' }}
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
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              Обновить
            </Button>
          </div>

          <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }} />

          {/* Список сообщений */}
          <div 
            style={{ 
              minHeight: isMobile ? '300px' : '400px', 
              maxHeight: isMobile ? '400px' : '600px', 
              overflowY: 'auto',
              background: '#fff',
              borderRadius: isMobile ? 8 : 12,
              border: '1px solid #e5e7eb',
              padding: isMobile ? 12 : 16,
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: isMobile ? '24px' : '40px' }}>
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

          <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }} />

          {/* Форма отправки сообщения */}
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

