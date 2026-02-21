import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { internalCommunicationApi, InternalMessage, MeetingRequest } from '../../../api/internalCommunication';

const isDebugEnabled = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('debug_api') === '1';

export const useInternalCommunication = () => {
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadMessages = useCallback(async () => {
    try {
      const data = await internalCommunicationApi.getMessages();
      setMessages(data);
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка загрузки сообщений:', error);
      message.error('Не удалось загрузить сообщения');
    }
  }, []);

  const loadMeetingRequests = useCallback(async () => {
    try {
      const data = await internalCommunicationApi.getMeetingRequests();
      setMeetingRequests(data);
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка загрузки запросов на встречи:', error);
      message.error('Не удалось загрузить запросы на встречи');
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await internalCommunicationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка загрузки количества непрочитанных:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadMessages(), loadMeetingRequests(), loadUnreadCount()]);
    } finally {
      setLoading(false);
    }
  }, [loadMeetingRequests, loadMessages, loadUnreadCount]);

  useEffect(() => {
    loadAll();
    
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const sendMessage = async (data: {
    recipient_id: number;
    subject: string;
    message: string;
    message_type?: string;
    priority?: string;
  }) => {
    try {
      await internalCommunicationApi.sendMessage(data);
      message.success('Сообщение отправлено');
      await loadMessages();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка отправки сообщения:', error);
      message.error('Не удалось отправить сообщение');
      throw error;
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      await internalCommunicationApi.markAsRead(messageId);
      await loadMessages();
      await loadUnreadCount();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка отметки сообщения:', error);
      message.error('Не удалось отметить сообщение');
    }
  };

  const archiveMessage = async (messageId: number) => {
    try {
      await internalCommunicationApi.archiveMessage(messageId);
      message.success('Сообщение архивировано');
      await loadMessages();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка архивирования:', error);
      message.error('Не удалось архивировать сообщение');
    }
  };

  const requestMeeting = async (data: {
    director_id: number;
    subject: string;
    description: string;
    proposed_date: string;
  }) => {
    try {
      await internalCommunicationApi.requestMeeting(data);
      message.success('Запрос на встречу отправлен');
      await loadMeetingRequests();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка запроса встречи:', error);
      message.error('Не удалось отправить запрос на встречу');
      throw error;
    }
  };

  const approveMeeting = async (meetingId: number, approvedDate?: string) => {
    try {
      await internalCommunicationApi.approveMeeting(meetingId, approvedDate);
      message.success('Встреча одобрена');
      await loadMeetingRequests();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка одобрения встречи:', error);
      message.error('Не удалось одобрить встречу');
    }
  };

  const rejectMeeting = async (meetingId: number, reason: string) => {
    try {
      await internalCommunicationApi.rejectMeeting(meetingId, reason);
      message.success('Встреча отклонена');
      await loadMeetingRequests();
    } catch (error) {
      if (isDebugEnabled()) console.error('Ошибка отклонения встречи:', error);
      message.error('Не удалось отклонить встречу');
    }
  };

  return {
    messages,
    meetingRequests,
    loading,
    unreadCount,
    sendMessage,
    markAsRead,
    archiveMessage,
    requestMeeting,
    approveMeeting,
    rejectMeeting,
    refresh: loadAll,
  };
};
