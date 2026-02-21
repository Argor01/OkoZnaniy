import { apiClient } from './client';

export interface InternalMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  recipient: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  subject: string;
  message: string;
  message_type: 'question' | 'report' | 'request' | 'notification';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at?: string;
  parent_message_id?: number;
}

export interface MeetingRequest {
  id: number;
  requester: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  director: {
    id: number;
    first_name: string;
    last_name: string;
  };
  subject: string;
  description: string;
  proposed_date: string;
  approved_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const internalCommunicationApi = {
  
  getMessages: async (isArchived = false): Promise<InternalMessage[]> => {
    const response = await apiClient.get('/director/internal-communication/', {
      params: { is_archived: isArchived },
    });
    return response.data;
  },

  
  sendMessage: async (data: {
    recipient_id: number;
    subject: string;
    message: string;
    message_type?: string;
    priority?: string;
    parent_message_id?: number;
  }): Promise<InternalMessage> => {
    const response = await apiClient.post('/director/internal-communication/send_message/', data);
    return response.data;
  },

  
  markAsRead: async (messageId: number): Promise<void> => {
    await apiClient.post(`/director/internal-communication/${messageId}/mark_as_read/`);
  },

  
  archiveMessage: async (messageId: number): Promise<void> => {
    await apiClient.post(`/director/internal-communication/${messageId}/archive/`);
  },

  
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/director/internal-communication/unread_count/');
    return response.data.unread_count;
  },

  
  getMeetingRequests: async (status?: string): Promise<MeetingRequest[]> => {
    const response = await apiClient.get('/director/meeting-requests/', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  
  requestMeeting: async (data: {
    director_id: number;
    subject: string;
    description: string;
    proposed_date: string;
  }): Promise<MeetingRequest> => {
    const response = await apiClient.post('/director/meeting-requests/request_meeting/', data);
    return response.data;
  },

  
  approveMeeting: async (meetingId: number, approvedDate?: string): Promise<void> => {
    await apiClient.post(`/director/meeting-requests/${meetingId}/approve/`, {
      approved_date: approvedDate,
    });
  },

  
  rejectMeeting: async (meetingId: number, reason: string): Promise<void> => {
    await apiClient.post(`/director/meeting-requests/${meetingId}/reject/`, {
      reason,
    });
  },
};
