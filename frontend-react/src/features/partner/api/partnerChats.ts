import { apiClient } from '@/api/client';
import { logger } from '@/utils/logger';

// Chat Rooms API для партнеров
export const getChatRooms = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/director/chat-rooms/');
    const data = response.data;
    return data.results || data || [];
  } catch (error) {
    logger.error('Error fetching partner chat rooms:', error);
    throw error;
  }
};

export const createChatRoom = async (data: { name: string; description?: string; type: string }): Promise<any> => {
  try {
    const response = await apiClient.post('/director/chat-rooms/', {
      name: data.name,
      description: data.description || '',
      type: data.type,
    });
    return response.data;
  } catch (error) {
    logger.error('Error creating partner chat room:', error);
    throw error;
  }
};

export const getChatRoomMessages = async (roomId: number): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/director/chat-rooms/${roomId}/messages/`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching partner chat room messages:', error);
    throw error;
  }
};

export const sendChatRoomMessage = async (roomId: number, message: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/director/chat-rooms/${roomId}/send_message/`, {
      message,
    });
    return response.data;
  } catch (error) {
    logger.error('Error sending partner message:', error);
    throw error;
  }
};

export const joinChatRoom = async (roomId: number): Promise<void> => {
  try {
    await apiClient.post(`/director/chat-rooms/${roomId}/join_room/`);
  } catch (error) {
    logger.error('Error joining partner chat room:', error);
    throw error;
  }
};

export const leaveChatRoom = async (roomId: number): Promise<void> => {
  try {
    await apiClient.post(`/director/chat-rooms/${roomId}/leave_room/`);
  } catch (error) {
    logger.error('Error leaving partner chat room:', error);
    throw error;
  }
};

export const inviteToChatRoom = async (roomId: number, userId: number): Promise<void> => {
  try {
    await apiClient.post(`/director/chat-rooms/${roomId}/invite_user/`, {
      user_id: userId,
    });
  } catch (error) {
    logger.error('Error inviting user to partner chat:', error);
    throw error;
  }
};

export const uploadChatRoomFile = async (roomId: number, file: File, message?: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (message) formData.append('message', message);
    const response = await apiClient.post(`/director/chat-rooms/${roomId}/upload_file/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Error uploading file to partner chat:', error);
    throw error;
  }
};

export const updateChatRoom = async (roomId: number, data: { name?: string }): Promise<any> => {
  try {
    const response = await apiClient.patch(`/director/chat-rooms/${roomId}/`, data);
    return response.data;
  } catch (error) {
    logger.error('Error updating partner chat room:', error);
    throw error;
  }
};

export const markChatRoomAsRead = async (roomId: number): Promise<void> => {
  try {
    await apiClient.post(`/director/chat-rooms/${roomId}/mark_read/`);
  } catch (error) {
    logger.error('Error marking partner chat room as read:', error);
  }
};

export const pinChatRoomMessage = async (roomId: number, msgId: number): Promise<void> => {
  try {
    await apiClient.post(`/director/chat-rooms/${roomId}/pin_message/`, { message_id: msgId });
  } catch (error) {
    logger.error('Error pinning partner chat message:', error);
    throw error;
  }
};

export const getPartnerUsers = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/director/chat-rooms/chat_users/');
    return response.data || [];
  } catch (error) {
    logger.error('Error fetching partner chat users:', error);
    return [];
  }
};
