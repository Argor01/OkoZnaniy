import { apiClient } from '@/api/client';

// Chat Rooms API для партнеров
export const getChatRooms = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/partner/chat-rooms/');
    return response.data;
  } catch (error) {
    console.error('Error fetching partner chat rooms:', error);
    throw error;
  }
};

export const createChatRoom = async (data: { name: string; description?: string; type: string }): Promise<any> => {
  try {
    const response = await apiClient.post('/partner/chat-rooms/', {
      name: data.name,
      description: data.description || '',
      type: data.type,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating partner chat room:', error);
    throw error;
  }
};

export const getChatRoomMessages = async (roomId: number): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/partner/chat-rooms/${roomId}/messages/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching partner chat room messages:', error);
    throw error;
  }
};

export const sendChatRoomMessage = async (roomId: number, message: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/partner/chat-rooms/${roomId}/send_message/`, {
      message,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending partner message:', error);
    throw error;
  }
};

export const joinChatRoom = async (roomId: number): Promise<void> => {
  try {
    await apiClient.post(`/partner/chat-rooms/${roomId}/join_room/`);
  } catch (error) {
    console.error('Error joining partner chat room:', error);
    throw error;
  }
};

export const leaveChatRoom = async (roomId: number): Promise<void> => {
  try {
    await apiClient.post(`/partner/chat-rooms/${roomId}/leave_room/`);
  } catch (error) {
    console.error('Error leaving partner chat room:', error);
    throw error;
  }
};

export const inviteToChatRoom = async (roomId: number, userId: number): Promise<void> => {
  try {
    await apiClient.post(`/partner/chat-rooms/${roomId}/invite_user/`, {
      user_id: userId,
    });
  } catch (error) {
    console.error('Error inviting user to partner chat:', error);
    throw error;
  }
};

export const uploadChatRoomFile = async (roomId: number, file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/partner/chat-rooms/${roomId}/upload_file/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file to partner chat:', error);
    throw error;
  }
};