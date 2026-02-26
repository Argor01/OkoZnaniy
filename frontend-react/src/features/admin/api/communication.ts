import { apiClient } from '@/api/client';
import { DirectorCommunication } from '@/features/admin/types/admin';
import { API_ENDPOINTS } from '@/config/endpoints';

export const communicationApi = {
  // Chat Rooms
  getChatRooms: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.communication.chatRooms.list);
    return Array.isArray(response.data) ? response.data : [];
  },

  getChatRoomMessages: async (roomId: number) => {
    const response = await apiClient.get(API_ENDPOINTS.admin.communication.chatRooms.messages(roomId));
    return Array.isArray(response.data) ? response.data : [];
  },

  sendChatRoomMessage: async (roomId: number, message: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.messages(roomId), { message });
    return response.data;
  },

  joinChatRoom: async (roomId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.join(roomId));
    return response.data;
  },

  leaveChatRoom: async (roomId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.leave(roomId));
    return response.data;
  },

  createChatRoom: async (roomData: any) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.list, roomData);
    return response.data;
  },

  inviteToChatRoom: async (roomId: number, userId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.invite(roomId), { user_id: userId });
    return response.data;
  },

  uploadChatRoomFile: async (roomId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.chatRooms.files(roomId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Director Communications
  getDirectorCommunications: async () => {
    const response = await apiClient.get(API_ENDPOINTS.admin.communication.director.list);
    return Array.isArray(response.data) ? response.data : [];
  },

  getDirectorCommunicationMessages: async (communicationId: number) => {
    const response = await apiClient.get(API_ENDPOINTS.admin.communication.director.messages(communicationId));
    return Array.isArray(response.data) ? response.data : [];
  },

  sendDirectorMessage: async (communicationId: number, message: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.director.sendMessage(communicationId), { message });
    return response.data;
  },

  createDirectorCommunication: async (communicationData: Partial<DirectorCommunication>) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.communication.director.list, communicationData);
    return response.data;
  },
};
