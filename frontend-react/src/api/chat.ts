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
  file?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  is_read: boolean;
  is_mine: boolean;
  created_at: string;
  message_type?: 'text' | 'offer';
  offer_data?: {
    description?: string;
    work_type?: string;
    subject?: string;
    cost?: number;
    deadline?: string;
    status?: 'new' | 'accepted' | 'rejected';
    order_id?: number;
  } | null;
}

export interface ChatListItem {
  id: number;
  order: number;
  order_id?: number;
  order_title?: string | null;
  participants: User[];
  other_user: User;
  last_message: {
    text: string;
    sender_id: number;
    created_at: string;
    file_name?: string | null;
    file_url?: string | null;
  } | null;
  last_message_time: string;
  unread_count: number;
}

export interface ChatDetail {
  id: number;
  order: number;
  order_id: number;
  order_title?: string | null;
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

  getChats: async (): Promise<ChatListItem[]> => chatApi.getAll(),

  getById: async (id: number): Promise<ChatDetail> => {
    const response = await apiClient.get(`/chat/chats/${id}/`);
    return response.data;
  },

  getMessages: async (chatId: number): Promise<Message[]> => {
    const chat = await chatApi.getById(chatId);
    return chat.messages ?? [];
  },

  // Получить или создать чат по ID заказа
  getOrCreateByOrder: async (orderId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_order/', {
      order_id: orderId,
    });
    return response.data;
  },

  // Получить или создать чат по ID заказа и ID пользователя (эксперт/клиент)
  getOrCreateByOrderAndUser: async (orderId: number, userId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_order_and_user/', {
      order_id: orderId,
      user_id: userId,
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

  // Отправить сообщение (текст и/или файл, или предложение)
  sendMessage: async (chatId: number, text: string, file?: File, messageType: 'text' | 'offer' = 'text', offerData?: any): Promise<Message> => {
    if (file) {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('file', file);
      formData.append('message_type', messageType);
      if (offerData) {
        formData.append('offer_data', JSON.stringify(offerData));
      }
      const response = await apiClient.post(`/chat/chats/${chatId}/send_message/`, formData);
      return response.data;
    }
    const response = await apiClient.post(`/chat/chats/${chatId}/send_message/`, { 
      text, 
      message_type: messageType,
      offer_data: offerData 
    });
    return response.data;
  },

  acceptOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/accept_offer/`, { message_id: messageId });
    return response.data;
  },

  rejectOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/reject_offer/`, { message_id: messageId });
    return response.data;
  },

  // Отправить группу файлов одним действием (создаёт несколько сообщений на бэке)
  sendMessageWithFiles: async (chatId: number, text: string, files: File[]): Promise<Message[]> => {
    const filesToSend = Array.isArray(files) ? files : [];
    const results: Message[] = [];

    for (let i = 0; i < filesToSend.length; i++) {
      const file = filesToSend[i];
      const textForThis = i === 0 ? text : '';
      // Используем существующую реализацию, чтобы гарантировать multipart
      const msg = await chatApi.sendMessage(chatId, textForThis, file);
      results.push(msg);
    }

    return results;
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
