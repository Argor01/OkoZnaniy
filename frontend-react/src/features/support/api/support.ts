import { apiClient } from '@/api/client';
import { CreateSupportChatRequest, SupportChat, SupportMessage } from '@/features/support/types/support';
import { API_ENDPOINTS } from '@/config/endpoints';

export type { CreateSupportChatRequest, SupportChat, SupportMessage };

export const supportApi = {
  
  getChats: async (status?: string): Promise<SupportChat[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get(API_ENDPOINTS.support.chats, { params });
    return response.data;
  },

  
  createChat: async (data: CreateSupportChatRequest): Promise<SupportChat> => {
    console.log('🔧 API: Отправка запроса на создание чата:', data);
    console.log('🔧 API: Endpoint:', API_ENDPOINTS.support.chats);
    const response = await apiClient.post(API_ENDPOINTS.support.chats, data);
    console.log('✅ API: Ответ от сервера:', response.data);
    return response.data;
  },

  
  getMessages: async (chatId: number): Promise<SupportMessage[]> => {
    const response = await apiClient.get(API_ENDPOINTS.support.messages(chatId));
    return response.data;
  },

  
  sendMessage: async (chatId: number, text: string, file?: File): Promise<SupportMessage> => {
    const formData = new FormData();
    formData.append('text', text);
    if (file) {
      formData.append('file', file);
    }

    const response = await apiClient.post(API_ENDPOINTS.support.sendMessage(chatId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  
  takeChat: async (chatId: number): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.support.take(chatId));
  },

  
  closeChat: async (chatId: number): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.support.close(chatId));
  },

  
  createTicket: async (chatId: number): Promise<{ ticket_id: number; created: boolean; status: string; message: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.support.createTicket(chatId));
    return response.data;
  },
};
