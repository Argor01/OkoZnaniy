import apiClient from '@/api/client';
import { Claim, SupportChat, SupportRequest } from '@/features/support/types/support';
import { API_ENDPOINTS } from '@/config/endpoints';

export const supportApi = {
  updateTicketStatus: async (ticketId: number, status: string, type: 'support_request' | 'claim') => {
    if (type === 'support_request') {
      const response = await apiClient.patch(API_ENDPOINTS.admin.support.requests.detail(ticketId), { status });
      return response.data;
    } else {
      const response = await apiClient.patch(API_ENDPOINTS.admin.support.claims.detail(ticketId), { status });
      return response.data;
    }
  },

  updateTicketPriority: async (ticketId: number, priority: string, type: 'support_request' | 'claim') => {
    if (type === 'support_request') {
      const response = await apiClient.patch(API_ENDPOINTS.admin.support.requests.detail(ticketId), { priority });
      return response.data;
    } else {
      const response = await apiClient.patch(API_ENDPOINTS.admin.support.claims.detail(ticketId), { priority });
      return response.data;
    }
  },

  assignTicketAdmin: async (ticketId: number, adminId: number, type: 'support_request' | 'claim') => {
    if (type === 'support_request') {
      const response = await apiClient.post(API_ENDPOINTS.admin.support.requests.assign(ticketId), { admin_id: adminId });
      return response.data;
    } else {
      const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.assign(ticketId), { admin_id: adminId });
      return response.data;
    }
  },


  getSupportRequests: async (status?: string): Promise<SupportRequest[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get(API_ENDPOINTS.admin.support.requests.list, { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  getSupportRequest: async (requestId: number): Promise<SupportRequest> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.support.requests.detail(requestId));
    return response.data;
  },

  takeSupportRequest: async (requestId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.requests.take(requestId));
    return response.data;
  },

  completeSupportRequest: async (requestId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.requests.complete(requestId));
    return response.data;
  },

  sendSupportMessage: async (requestId: number, message: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.requests.messages(requestId), { message });
    return response.data;
  },

  // Support Chats
  getSupportChats: async (): Promise<SupportChat[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.support.chats.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  sendSupportChatMessage: async (chatId: number, message: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.chats.messages(chatId), { message });
    return response.data;
  },

  // Claims
  getClaims: async (status?: string): Promise<Claim[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get(API_ENDPOINTS.admin.support.claims.list, { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    return [];
  },

  getClaim: async (claimId: number): Promise<Claim> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.support.claims.detail(claimId));
    return response.data;
  },

  takeClaimInWork: async (claimId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.take(claimId));
    return response.data;
  },

  completeClaim: async (claimId: number, resolution: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.complete(claimId), { resolution });
    return response.data;
  },

  rejectClaim: async (claimId: number, reason: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.reject(claimId), { reason });
    return response.data;
  },

  updateClaimProgress: async (claimId: number, progress: number) => {
    const response = await apiClient.patch(API_ENDPOINTS.admin.support.claims.progress(claimId), { progress });
    return response.data;
  },

  reopenClaim: async (claimId: number, reason: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.reopen(claimId), { reason });
    return response.data;
  },

  approveClaim: async (claimId: number, decision: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.approve(claimId), { decision });
    return response.data;
  },

  rejectClaimApproval: async (claimId: number, reason: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.rejectApproval(claimId), { reason });
    return response.data;
  },

  escalateClaim: async (claimId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.escalate(claimId));
    return response.data;
  },

  requestClaimInfo: async (claimId: number, questions: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.requestInfo(claimId), { questions });
    return response.data;
  },

  sendClaimMessage: async (claimId: number, message: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.support.claims.messages(claimId), { message });
    return response.data;
  },

  // Управление назначениями
  assignUsersToTicket: async (ticketId: number, userIds: number[], type: 'support_request' | 'claim') => {
    const endpoint = type === 'support_request' 
      ? `/admin-panel/support-requests/${ticketId}/assign_users/`
      : `/admin-panel/claims/${ticketId}/assign_users/`;
    const response = await apiClient.post(endpoint, { user_ids: userIds });
    return response.data;
  },

  // Управление тегами
  addTagToTicket: async (ticketId: number, tag: string, type: 'support_request' | 'claim') => {
    const endpoint = type === 'support_request' 
      ? `/admin-panel/support-requests/${ticketId}/add_tag/`
      : `/admin-panel/claims/${ticketId}/add_tag/`;
    const response = await apiClient.post(endpoint, { tag });
    return response.data;
  },

  removeTagFromTicket: async (ticketId: number, tag: string, type: 'support_request' | 'claim') => {
    const endpoint = type === 'support_request' 
      ? `/admin-panel/support-requests/${ticketId}/remove_tag/`
      : `/admin-panel/claims/${ticketId}/remove_tag/`;
    const response = await apiClient.post(endpoint, { tag });
    return response.data;
  },

  updateTicketTags: async (ticketId: number, tags: string, type: 'support_request' | 'claim') => {
    const endpoint = type === 'support_request' 
      ? `/admin-panel/support-requests/${ticketId}/update_tags/`
      : `/admin-panel/claims/${ticketId}/update_tags/`;
    const response = await apiClient.post(endpoint, { tags });
    return response.data;
  },

  // Получение списка админов для назначения
  getAdminUsers: async () => {
    const response = await apiClient.get('/admin-panel/users/?role=admin');
    return response.data;
  },
};
