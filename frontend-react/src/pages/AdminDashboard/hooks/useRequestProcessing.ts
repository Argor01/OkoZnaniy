/**
 * Хук для обработки запросов клиентов
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '../utils/requestsApi';
import { requestNotifications } from '../utils/notificationHelpers';
import type { 
  CustomerRequest, 
  RequestMessage, 
  RequestStatus,
  RequestsApiResponse,
  MessagesApiResponse 
} from '../types/requests.types';

export const useRequestProcessing = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>('open');

  // Получение списка запросов с фильтрацией
  const {
    data: requestsResponse,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery<RequestsApiResponse>({
    queryKey: ['admin-customer-requests', selectedStatus],
    queryFn: () => requestsApi.getRequests({ status: selectedStatus }),
    refetchInterval: 30000, // Обновление каждые 30 секунд
    staleTime: 10000, // Данные считаются свежими 10 секунд
    gcTime: 300000, // Кэш на 5 минут
  });

  // Извлекаем массив запросов из ответа
  const requests = requestsResponse?.results || [];

  // Получение сообщений выбранного запроса
  const {
    data: messagesResponse,
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery<MessagesApiResponse>({
    queryKey: ['request-messages', selectedRequest?.id],
    queryFn: () => selectedRequest ? requestsApi.getRequestMessages(selectedRequest.id) : Promise.resolve({ results: [], count: 0 }),
    enabled: !!selectedRequest,
    refetchInterval: 5000, // Обновление каждые 5 секунд для активного запроса
    staleTime: 2000, // Сообщения считаются свежими 2 секунды
  });

  // Извлекаем массив сообщений из ответа
  const requestMessages = messagesResponse?.results || [];

  // Получение статистики запросов
  const {
    data: requestStats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['request-stats'],
    queryFn: () => requestsApi.getRequestStats(),
    refetchInterval: 60000, // Обновление каждую минуту
    staleTime: 30000, // Статистика свежая 30 секунд
  });

  // Мутация: взятие запроса в работу
  const takeRequestMutation = useMutation({
    mutationFn: (requestId: number) => requestsApi.takeRequest(requestId),
    onSuccess: (updatedRequest) => {
      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-stats'] });
      
      // Обновляем выбранный запрос если это он
      if (selectedRequest?.id === updatedRequest.id) {
        setSelectedRequest(updatedRequest);
      }
      
      // Показываем уведомление
      requestNotifications.takeSuccess();
    },
    onError: (error: any) => {
      console.error('Error taking request:', error);
      requestNotifications.takeError(error?.response?.data?.message);
    },
  });

  // Мутация: отправка сообщения
  const sendMessageMutation = useMutation({
    mutationFn: ({ 
      requestId, 
      content, 
      isInternal = false, 
      attachments 
    }: {
      requestId: number;
      content: string;
      isInternal?: boolean;
      attachments?: File[];
    }) => requestsApi.sendMessage(requestId, content, isInternal, attachments),
    onSuccess: () => {
      // Обновляем сообщения
      queryClient.invalidateQueries({ queryKey: ['request-messages'] });
      // Обновляем список запросов (может измениться lastMessageAt)
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      
      requestNotifications.messageSuccess();
    },
    onError: (error: any) => {
      console.error('Error sending message:', error);
      requestNotifications.messageError(error?.response?.data?.message);
    },
  });

  // Мутация: завершение запроса
  const completeRequestMutation = useMutation({
    mutationFn: ({ requestId, resolution }: { requestId: number; resolution?: string }) => 
      requestsApi.completeRequest(requestId, resolution),
    onSuccess: (updatedRequest) => {
      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-stats'] });
      
      // Закрываем модальное окно
      setSelectedRequest(null);
      
      requestNotifications.completeSuccess();
    },
    onError: (error: any) => {
      console.error('Error completing request:', error);
      requestNotifications.completeError(error?.response?.data?.message);
    },
  });

  // Мутация: обновление запроса
  const updateRequestMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: any }) => 
      requestsApi.updateRequest(requestId, data),
    onSuccess: (updatedRequest) => {
      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      
      // Обновляем выбранный запрос если это он
      if (selectedRequest?.id === updatedRequest.id) {
        setSelectedRequest(updatedRequest);
      }
      
      requestNotifications.updateSuccess();
    },
    onError: (error: any) => {
      console.error('Error updating request:', error);
      requestNotifications.updateError(error?.response?.data?.message);
    },
  });

  // Мутация: назначение запроса
  const assignRequestMutation = useMutation({
    mutationFn: ({ requestId, adminId }: { requestId: number; adminId: number }) => 
      requestsApi.assignRequest(requestId, adminId),
    onSuccess: (updatedRequest) => {
      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['admin-customer-requests'] });
      
      // Обновляем выбранный запрос если это он
      if (selectedRequest?.id === updatedRequest.id) {
        setSelectedRequest(updatedRequest);
      }
      
      const adminName = updatedRequest.assignedAdmin?.name || 'администратору';
      requestNotifications.assignSuccess(adminName);
    },
    onError: (error: any) => {
      console.error('Error assigning request:', error);
      requestNotifications.assignError(error?.response?.data?.message);
    },
  });

  // Обработчики событий
  const handleRequestSelect = useCallback((request: CustomerRequest) => {
    setSelectedRequest(request);
  }, []);

  const handleRequestClose = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const handleStatusChange = useCallback((status: RequestStatus) => {
    setSelectedStatus(status);
  }, []);

  const takeRequest = useCallback((requestId: number) => {
    takeRequestMutation.mutate(requestId);
  }, [takeRequestMutation]);

  const sendMessage = useCallback((
    content: string, 
    isInternal = false, 
    attachments?: File[]
  ) => {
    if (selectedRequest) {
      sendMessageMutation.mutate({
        requestId: selectedRequest.id,
        content,
        isInternal,
        attachments
      });
    }
  }, [selectedRequest, sendMessageMutation]);

  const completeRequest = useCallback((requestId: number, resolution?: string) => {
    completeRequestMutation.mutate({ requestId, resolution });
  }, [completeRequestMutation]);

  const updateRequest = useCallback((requestId: number, data: any) => {
    updateRequestMutation.mutate({ requestId, data });
  }, [updateRequestMutation]);

  const assignRequest = useCallback((requestId: number, adminId: number) => {
    assignRequestMutation.mutate({ requestId, adminId });
  }, [assignRequestMutation]);

  // Поиск запросов
  const searchRequests = useCallback(async (query: string, filters?: any) => {
    try {
      const response = await requestsApi.searchRequests(query, filters);
      return response.results || [];
    } catch (error) {
      console.error('Error searching requests:', error);
      return [];
    }
  }, []);

  // Экспорт запросов
  const exportRequests = useCallback(async (format: 'csv' | 'excel', filters?: any) => {
    try {
      const blob = await requestsApi.exportRequests(format, filters);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `requests_export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      requestNotifications.fileUploadSuccess(`requests_export.${format}`);
    } catch (error) {
      console.error('Error exporting requests:', error);
      requestNotifications.fileUploadError('export', 'Ошибка при экспорте данных');
    }
  }, []);

  // Загрузка файла
  const uploadFile = useCallback(async (requestId: number, file: File, description?: string) => {
    try {
      const result = await requestsApi.uploadFile(requestId, file, description);
      
      // Обновляем сообщения
      queryClient.invalidateQueries({ queryKey: ['request-messages', requestId] });
      
      requestNotifications.fileUploadSuccess(file.name);
      return result;
    } catch (error) {
      console.error('Error uploading file:', error);
      requestNotifications.fileUploadError(file.name, 'Ошибка при загрузке файла');
      throw error;
    }
  }, [queryClient]);

  return {
    // Данные
    requests,
    requestMessages,
    requestStats,
    selectedRequest,
    selectedStatus,
    
    // Состояния загрузки
    requestsLoading,
    messagesLoading,
    statsLoading,
    isTakingRequest: takeRequestMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isCompletingRequest: completeRequestMutation.isPending,
    isUpdatingRequest: updateRequestMutation.isPending,
    isAssigningRequest: assignRequestMutation.isPending,
    
    // Ошибки
    requestsError,
    
    // Обработчики
    handleRequestSelect,
    handleRequestClose,
    handleStatusChange,
    takeRequest,
    sendMessage,
    completeRequest,
    updateRequest,
    assignRequest,
    searchRequests,
    exportRequests,
    uploadFile,
    
    // Методы обновления
    refetchRequests,
    refetchMessages,
  };
};
