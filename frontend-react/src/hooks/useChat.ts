import { useState, useEffect, useCallback } from 'react';
import { chatApi, ChatListItem, Message } from '../api/chat';

export const useChat = () => {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const apiChats = await chatApi.getChats();
      setChats(apiChats);
      
      const totalUnread = apiChats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = async (chatId: number, text: string, file?: File): Promise<Message> => {
    const message = await chatApi.sendMessage(chatId, text, file);
    await loadChats();
    return message;
  };

  const getMessages = async (chatId: number): Promise<Message[]> => {
    return await chatApi.getMessages(chatId);
  };

  useEffect(() => {
    loadChats();
    
    const interval = setInterval(loadChats, 15000);
    return () => clearInterval(interval);
  }, [loadChats]);

  return {
    chats,
    loading,
    unreadCount,
    loadChats,
    sendMessage,
    getMessages,
  };
};
