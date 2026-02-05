import { useState, useEffect, useCallback } from 'react';
import { SupportRequest, SupportMessage, SupportStats, SupportStatus } from '../types/support.types';
import { 
  mockSupportRequests, 
  mockSupportMessages, 
  mockSupportStats,
  getSupportRequestsByStatus,
  getSupportRequestById,
  getMessagesByRequestId
} from '../utils/mockSupportData';

/**
 * Хук для работы с запросами поддержки
 */
export const useSupportRequests = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>('open');
  const [stats, setStats] = useState<SupportStats>(mockSupportStats);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [requestMessages, setRequestMessages] = useState<SupportMessage[]>([]);

  // Загрузка запросов
  const fetchRequests = useCallback(async (status?: SupportStatus) => {
    setLoading(true);
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statusToFetch = status || selectedStatus;
      const filteredRequests = getSupportRequestsByStatus(statusToFetch);
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Error fetching support requests:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  // Загрузка всех запросов (для статистики)
  const fetchAllRequests = useCallback(async () => {
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 300));
      setRequests(mockSupportRequests);
    } catch (error) {
      console.error('Error fetching all support requests:', error);
    }
  }, []);

  // Загрузка сообщений для запроса
  const fetchRequestMessages = useCallback(async (requestId: number) => {
    try {
      const messages = getMessagesByRequestId(requestId);
      setRequestMessages(messages);
    } catch (error) {
      console.error('Error fetching request messages:', error);
    }
  }, []);

  // Взять запрос в работу
  const takeRequest = useCallback(async (requestId: number) => {
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                status: 'in_progress' as const,
                assignedAdmin: {
                  id: 1,
                  name: 'Текущий администратор',
                  avatar: 'https://randomuser.me/api/portraits/women/10.jpg'
                },
                updatedAt: new Date().toISOString()
              }
            : request
        )
      );

      // Обновляем статистику
      setStats(prevStats => ({
        ...prevStats,
        openRequests: prevStats.openRequests - 1,
        inProgressRequests: prevStats.inProgressRequests + 1
      }));

      // Если текущий статус "открытые", перезагружаем список
      if (selectedStatus === 'open') {
        fetchRequests('open');
      }

      return true;
    } catch (error) {
      console.error('Error taking request:', error);
      return false;
    }
  }, [selectedStatus, fetchRequests]);

  // Завершить запрос
  const completeRequest = useCallback(async (requestId: number) => {
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                status: 'completed' as const,
                updatedAt: new Date().toISOString()
              }
            : request
        )
      );

      // Обновляем статистику
      setStats(prevStats => ({
        ...prevStats,
        inProgressRequests: prevStats.inProgressRequests - 1,
        completedToday: prevStats.completedToday + 1
      }));

      // Если текущий статус "в процессе", перезагружаем список
      if (selectedStatus === 'in_progress') {
        fetchRequests('in_progress');
      }

      return true;
    } catch (error) {
      console.error('Error completing request:', error);
      return false;
    }
  }, [selectedStatus, fetchRequests]);

  // Отправить сообщение
  const sendMessage = useCallback(async (requestId: number, content: string, attachments?: File[]) => {
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newMessage: SupportMessage = {
        id: Date.now(),
        requestId,
        senderId: 1, // ID текущего администратора
        senderType: 'admin',
        senderName: 'Текущий администратор',
        senderAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        content,
        type: 'text',
        createdAt: new Date().toISOString(),
        isRead: false,
        attachments: attachments?.map((file, index) => ({
          id: Date.now() + index,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          type: file.type
        }))
      };

      setRequestMessages(prevMessages => [...prevMessages, newMessage]);

      // Обновляем счетчик сообщений в запросе
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                messagesCount: request.messagesCount + 1,
                lastMessageAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : request
        )
      );

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  // Изменение статуса фильтра
  const handleStatusChange = useCallback((status: SupportStatus) => {
    setSelectedStatus(status);
    fetchRequests(status);
  }, [fetchRequests]);

  // Выбор запроса для просмотра
  const handleRequestSelect = useCallback((request: SupportRequest) => {
    setSelectedRequest(request);
    fetchRequestMessages(request.id);
  }, [fetchRequestMessages]);

  // Закрытие модального окна запроса
  const handleRequestClose = useCallback(() => {
    setSelectedRequest(null);
    setRequestMessages([]);
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Обновление статистики каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      // В реальном приложении здесь был бы API запрос
      setStats(mockSupportStats);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Данные
    requests,
    loading,
    selectedStatus,
    stats,
    selectedRequest,
    requestMessages,

    // Методы
    takeRequest,
    completeRequest,
    sendMessage,
    handleStatusChange,
    handleRequestSelect,
    handleRequestClose,
    refetch: fetchRequests,
    fetchAllRequests
  };
};