import apiClient from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

export interface Message {
  id: number;
  sender: User;
  sender_id: number;
  text: string;
  is_read: boolean;
  is_mine: boolean;
  created_at: string;
}

export interface ChatListItem {
  id: number;
  order: number;
  order_id: number;
  participants: User[];
  other_user: User;
  last_message: {
    text: string;
    sender_id: number;
    created_at: string;
  } | null;
  last_message_time: string;
  unread_count: number;
}

export interface ChatDetail {
  id: number;
  order: number;
  order_id: number;
  participants: User[];
  other_user: User;
  messages: Message[];
  unread_count: number;
}

export const chatApi = {
  // Получить список всех чатов
  getAll: async (): Promise<ChatListItem[]> => {
    const response = await apiClient.get('/chat/chats/');
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  // Получить детали чата
  getById: async (id: number): Promise<ChatDetail> => {
    const response = await apiClient.get(`/chat/chats/${id}/`);
    return response.data;
  },

  // Получить или создать чат по ID заказа
  getOrCreateByOrder: async (orderId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_order/', {
      order_id: orderId,
    });
    return response.data;
  },

  // Получить или создать чат с конкретным пользователем
  getOrCreateByUser: async (userId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_user/', {
      user_id: userId,
    });
    return response.data;
  },

  // Отправить сообщение
  sendMessage: async (chatId: number, text: string): Promise<Message> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/send_message/`, {
      text,
    });
    return response.data;
  },

  // Отметить все сообщения в чате как прочитанные
  markAsRead: async (chatId: number): Promise<void> => {
    await apiClient.post(`/chat/chats/${chatId}/mark_read/`);
  },

  // Получить общее количество непрочитанных сообщений
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/chat/chats/unread_count/');
    return response.data.unread_count;
  },
};
