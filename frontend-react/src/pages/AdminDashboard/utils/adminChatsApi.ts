

import { apiClient } from '../../../api/client';
import type { AdminChatGroup, ChatMessage, AdminUser } from '../types/requests.types';

export interface AdminChatApiResponse {
  results: AdminChatGroup[];
  count: number;
  next?: string;
  previous?: string;
}

export interface ChatMessagesApiResponse {
  results: ChatMessage[];
  count: number;
  next?: string;
  previous?: string;
}

export interface CreateChatForm {
  name: string;
  type: 'general' | 'department' | 'private';
  participantIds: number[];
  description?: string;
}

export const adminChatsApi = {
  
  async getChats(params?: {
    type?: 'general' | 'department' | 'private';
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminChatApiResponse> {
    const response = await apiClient.get('/admin/chats/', { params });
    return response.data;
  },

  
  async getChat(chatId: number): Promise<AdminChatGroup> {
    const response = await apiClient.get(`/admin/chats/${chatId}/`);
    return response.data;
  },

  
  async getChatMessages(chatId: number, params?: {
    page?: number;
    page_size?: number;
    before?: string; 
    after?: string;  
  }): Promise<ChatMessagesApiResponse> {
    const response = await apiClient.get(`/admin/chats/${chatId}/messages/`, { params });
    return response.data;
  },

  
  async sendChatMessage(
    chatId: number, 
    content: string, 
    replyToId?: number,
    attachments?: File[]
  ): Promise<ChatMessage> {
    const formData = new FormData();
    formData.append('content', content);
    
    if (replyToId) {
      formData.append('reply_to', replyToId.toString());
    }
    
    
    if (attachments && attachments.length > 0) {
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    const response = await apiClient.post(
      `/admin/chats/${chatId}/messages/`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  
  async createChat(data: CreateChatForm): Promise<AdminChatGroup> {
    const response = await apiClient.post('/admin/chats/', {
      name: data.name,
      chat_type: data.type,
      participant_ids: data.participantIds,
      description: data.description,
    });
    return response.data;
  },

  
  async updateChat(chatId: number, data: {
    name?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<AdminChatGroup> {
    const response = await apiClient.patch(`/admin/chats/${chatId}/`, data);
    return response.data;
  },

  
  async joinChat(chatId: number): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`/admin/chats/${chatId}/join/`);
    return response.data;
  },

  
  async leaveChat(chatId: number): Promise<{ status: string; message: string }> {
    const response = await apiClient.post(`/admin/chats/${chatId}/leave/`);
    return response.data;
  },

  
  async addParticipants(chatId: number, participantIds: number[]): Promise<AdminChatGroup> {
    const response = await apiClient.post(`/admin/chats/${chatId}/add-participants/`, {
      participant_ids: participantIds,
    });
    return response.data;
  },

  
  async removeParticipants(chatId: number, participantIds: number[]): Promise<AdminChatGroup> {
    const response = await apiClient.post(`/admin/chats/${chatId}/remove-participants/`, {
      participant_ids: participantIds,
    });
    return response.data;
  },

  
  async getAvailableAdmins(chatId?: number): Promise<AdminUser[]> {
    const params = chatId ? { exclude_chat: chatId } : {};
    const response = await apiClient.get('/admin/users/admins/', { params });
    return response.data;
  },

  
  async markMessagesAsRead(chatId: number, messageIds?: number[]): Promise<void> {
    await apiClient.post(`/admin/chats/${chatId}/mark-read/`, {
      message_ids: messageIds,
    });
  },

  
  async getUnreadCount(chatId?: number): Promise<{ [chatId: number]: number } | number> {
    const params = chatId ? { chat_id: chatId } : {};
    const response = await apiClient.get('/admin/chats/unread-count/', { params });
    return response.data;
  },

  
  async searchMessages(chatId: number, query: string, params?: {
    date_from?: string;
    date_to?: string;
    sender_id?: number;
  }): Promise<ChatMessagesApiResponse> {
    const searchParams = {
      search: query,
      ...params,
    };
    
    const response = await apiClient.get(`/admin/chats/${chatId}/search/`, { 
      params: searchParams 
    });
    return response.data;
  },

  
  async deleteMessage(chatId: number, messageId: number): Promise<void> {
    await apiClient.delete(`/admin/chats/${chatId}/messages/${messageId}/`);
  },

  
  async editMessage(chatId: number, messageId: number, content: string): Promise<ChatMessage> {
    const response = await apiClient.patch(`/admin/chats/${chatId}/messages/${messageId}/`, {
      content,
    });
    return response.data;
  },

  
  async pinMessage(chatId: number, messageId: number, pin: boolean = true): Promise<ChatMessage> {
    const response = await apiClient.post(`/admin/chats/${chatId}/messages/${messageId}/pin/`, {
      pin,
    });
    return response.data;
  },

  
  async getPinnedMessages(chatId: number): Promise<ChatMessage[]> {
    const response = await apiClient.get(`/admin/chats/${chatId}/pinned-messages/`);
    return response.data;
  },

  
  async archiveChat(chatId: number): Promise<AdminChatGroup> {
    const response = await apiClient.post(`/admin/chats/${chatId}/archive/`);
    return response.data;
  },

  
  async unarchiveChat(chatId: number): Promise<AdminChatGroup> {
    const response = await apiClient.post(`/admin/chats/${chatId}/unarchive/`);
    return response.data;
  },

  
  async getChatStats(chatId: number, period?: 'day' | 'week' | 'month'): Promise<{
    total_messages: number;
    active_participants: number;
    messages_by_day: { date: string; count: number }[];
    top_participants: { user: AdminUser; message_count: number }[];
  }> {
    const params = period ? { period } : {};
    const response = await apiClient.get(`/admin/chats/${chatId}/stats/`, { params });
    return response.data;
  },

  
  async exportChatHistory(
    chatId: number, 
    format: 'txt' | 'json' | 'csv',
    params?: {
      date_from?: string;
      date_to?: string;
    }
  ): Promise<Blob> {
    const exportParams = {
      format,
      ...params,
    };
    
    const response = await apiClient.get(`/admin/chats/${chatId}/export/`, {
      params: exportParams,
      responseType: 'blob',
    });
    return response.data;
  },

  
  async getParticipantsOnlineStatus(chatId: number): Promise<{
    [userId: number]: {
      is_online: boolean;
      last_seen?: string;
    }
  }> {
    const response = await apiClient.get(`/admin/chats/${chatId}/online-status/`);
    return response.data;
  },

  
  async sendNotification(chatId: number, message: string, participantIds?: number[]): Promise<void> {
    await apiClient.post(`/admin/chats/${chatId}/notify/`, {
      message,
      participant_ids: participantIds,
    });
  },
};