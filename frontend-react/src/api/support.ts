import { apiClient } from './client';

export interface SupportChat {
  id: number;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  admin?: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
  };
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  last_message?: {
    text: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  text: string;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    is_admin: boolean;
  };
  message_type: 'text' | 'file' | 'system';
  file?: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

export const supportApi = {
  // Получить список чатов поддержки
  getChats: async (status?: string): Promise<SupportChat[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/chat/support/', { params });
    return response.data;
  },

  // Создать новый чат поддержки
  createChat: async (data: {
    subject: string;
    message: string;
    priority?: string;
  }): Promise<SupportChat> => {
    const response = await apiClient.post('/chat/support/', data);
    return response.data;
  },

  // Получить сообщения чата
  getMessages: async (chatId: number): Promise<SupportMessage[]> => {
    const response = await apiClient.get(`/chat/support/${chatId}/messages/`);
    return response.data;
  },

  // Отправить сообщение
  sendMessage: async (chatId: number, text: string, file?: File): Promise<SupportMessage> => {
    const formData = new FormData();
    formData.append('text', text);
    if (file) {
      formData.append('file', file);
    }

    const response = await apiClient.post(`/chat/support/${chatId}/send_message/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Взять чат в работу (для админов)
  takeChat: async (chatId: number): Promise<void> => {
    await apiClient.post(`/chat/support/${chatId}/take_chat/`);
  },

  // Закрыть чат
  closeChat: async (chatId: number): Promise<void> => {
    await apiClient.post(`/chat/support/${chatId}/close_chat/`);
  },
};
