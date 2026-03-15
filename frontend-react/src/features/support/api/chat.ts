import apiClient from '@/api/client';
import { ChatDetail, ChatListItem, Message } from '@/features/support/types/chat';

export type { ChatDetail, ChatListItem, Message };

export class ChatFrozenError extends Error {
  frozenReason?: string;

  constructor(message: string, frozenReason?: string) {
    super(message);
    this.name = 'ChatFrozenError';
    this.frozenReason = frozenReason;
  }
}

export const chatApi = {
  
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

  
  getOrCreateByOrder: async (orderId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_order/', {
      order_id: orderId,
    });
    return response.data;
  },

  
  getOrCreateByOrderAndUser: async (orderId: number, userId: number): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_order_and_user/', {
      order_id: orderId,
      user_id: userId,
    });
    return response.data;
  },

  
  getOrCreateByUser: async (userId: number, contextTitle?: string): Promise<ChatDetail> => {
    const response = await apiClient.post('/chat/chats/get_or_create_by_user/', {
      user_id: userId,
      ...(contextTitle ? { context_title: contextTitle } : {}),
    });
    return response.data;
  },

  
  sendMessage: async (
    chatId: number,
    text: string,
    file?: File,
    messageType: 'text' | 'offer' | 'work_offer' | 'work_delivery' = 'text',
    offerData?: any
  ): Promise<Message> => {
    try {
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
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.frozen) {
        const errorMessage = error.response.data.detail || 'Переписка временно недоступна из-за проверки правил безопасности.';
        const frozenReason = error.response.data.frozen_reason;
        throw new ChatFrozenError(errorMessage, frozenReason);
      }
      throw error;
    }
  },

  acceptOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/accept_offer/`, { message_id: messageId });
    return response.data;
  },

  rejectOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/reject_offer/`, { message_id: messageId });
    return response.data;
  },

  acceptWorkOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/accept_work_offer/`, { message_id: messageId });
    return response.data;
  },

  rejectWorkOffer: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/reject_work_offer/`, { message_id: messageId });
    return response.data;
  },

  deliverWorkOffer: async (chatId: number, messageId: number, file: File, text?: string): Promise<Message> => {
    const formData = new FormData();
    formData.append('message_id', String(messageId));
    formData.append('file', file);
    if (text) formData.append('text', text);
    const response = await apiClient.post(`/chat/chats/${chatId}/deliver_work_offer/`, formData);
    return response.data;
  },

  acceptWorkDelivery: async (chatId: number, messageId: number, rating?: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/accept_work_delivery/`, {
      message_id: messageId,
      ...(typeof rating === 'number' ? { rating } : {}),
    });
    return response.data;
  },

  rejectWorkDelivery: async (chatId: number, messageId: number): Promise<any> => {
    const response = await apiClient.post(`/chat/chats/${chatId}/reject_work_delivery/`, { message_id: messageId });
    return response.data;
  },

  
  sendMessageWithFiles: async (chatId: number, text: string, files: File[]): Promise<Message[]> => {
    const filesToSend = Array.isArray(files) ? files : [];
    const results: Message[] = [];

    for (let i = 0; i < filesToSend.length; i++) {
      const file = filesToSend[i];
      const textForThis = i === 0 ? text : '';
      
      const msg = await chatApi.sendMessage(chatId, textForThis, file);
      results.push(msg);
    }

    return results;
  },

  
  markAsRead: async (chatId: number): Promise<void> => {
    await apiClient.post(`/chat/chats/${chatId}/mark_read/`);
  },

  deleteChat: async (chatId: number): Promise<void> => {
    await apiClient.delete(`/chat/chats/${chatId}/`);
  },

  
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/chat/chats/unread_count/');
    return response.data.unread_count;
  },

  
  createClaim: async (data: {
    order_id?: number;
    claim_type: string;
    subject: string;
    description: string;
  }): Promise<any> => {
    const response = await apiClient.post('/admin-panel/claims/', data);
    return response.data;
  },
};
