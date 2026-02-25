import { apiClient } from '@/api/client';
import type {
  Claim,
  RefundRequest,
  Dispute,
  Decision,
  InternalMessage,
  DecisionRequest,
  RequestInfoRequest,
  SendForApprovalRequest,
  SendMessageRequest,
  GetClaimsParams,
  GetMessagesParams,
  GetStatisticsParams,
  PaginatedResponse,
  Statistics,
} from './types';

export const arbitratorApi = {
  getClaims: async (params?: GetClaimsParams): Promise<PaginatedResponse<Claim>> => {
    const response = await apiClient.get('/arbitrator/claims/', { params });
    return response.data;
  },

  getClaim: async (id: number): Promise<Claim> => {
    const response = await apiClient.get(`/arbitrator/claims/${id}/`);
    return response.data;
  },

  getMessages: async (params: GetMessagesParams): Promise<PaginatedResponse<InternalMessage>> => {
    const response = await apiClient.get('/arbitrator/messages/', { params });
    return response.data;
  },

  sendMessage: async (data: SendMessageRequest): Promise<InternalMessage> => {
    const response = await apiClient.post('/arbitrator/messages/', data);
    return response.data;
  },

  deleteMessage: async (id: number): Promise<void> => {
    await apiClient.delete(`/arbitrator/messages/${id}/`);
  },

  markMessageAsRead: async (id: number): Promise<void> => {
    await apiClient.post(`/arbitrator/messages/${id}/read/`);
  },

  takeClaim: async (id: number): Promise<void> => {
    await apiClient.post(`/arbitrator/claims/${id}/take/`);
  },

  submitDecision: async (id: number, data: DecisionRequest): Promise<void> => {
    await apiClient.post(`/arbitrator/claims/${id}/decision/`, data);
  },

  makeDecision: async (id: number, data: DecisionRequest): Promise<void> => {
    await apiClient.post(`/arbitrator/claims/${id}/decision/`, data);
  },

  requestInfo: async (id: number, data: RequestInfoRequest): Promise<void> => {
    await apiClient.post(`/arbitrator/claims/${id}/request_info/`, data);
  },

  sendForApproval: async (id: number, data: SendForApprovalRequest): Promise<void> => {
    await apiClient.post(`/arbitrator/claims/${id}/send_for_approval/`, data);
  },

  getStatistics: async (params?: GetStatisticsParams): Promise<Statistics> => {
    const response = await apiClient.get('/arbitrator/statistics/', { params });
    return response.data;
  },
};
