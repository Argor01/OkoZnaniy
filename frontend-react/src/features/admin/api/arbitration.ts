import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

export interface ArbitrationCase {
  id: number;
  case_number: string;
  plaintiff: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  defendant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  reason: string;
  reason_display: string;
  assigned_admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  messages_count: number;
  unread_count: number;
}

export interface ArbitrationStats {
  total_cases: number;
  new_cases: number;
  in_progress: number;
  awaiting_decision: number;
  closed_cases: number;
  urgent_cases: number;
}

export const arbitrationApi = {
  getCases: async (): Promise<ArbitrationCase[]> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.arbitration.cases.list);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
    return [];
  },

  getStats: async (): Promise<ArbitrationStats> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.arbitration.stats);
    return response.data;
  },

  getCase: async (caseNumber: string): Promise<ArbitrationCase> => {
    const response = await apiClient.get(API_ENDPOINTS.admin.arbitration.cases.detail(caseNumber));
    return response.data;
  },

  takeInWork: async (caseId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.takeInWork(caseId));
    return response.data;
  },

  sendMessage: async (caseId: number, message: string, isInternal = false) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.sendMessage(caseId), {
      message,
      is_internal: isInternal,
    });
    return response.data;
  },

  updateStatus: async (caseId: number, status: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.updateStatus(caseId), {
      status,
    });
    return response.data;
  },

  makeDecision: async (
    caseId: number,
    decision: string,
    approvedRefundPercentage?: number,
    approvedRefundAmount?: number
  ) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.makeDecision(caseId), {
      decision,
      approved_refund_percentage: approvedRefundPercentage,
      approved_refund_amount: approvedRefundAmount,
    });
    return response.data;
  },

  processRefund: async (caseId: number, refundPercentage: number, refundAmount?: number) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.processRefund(caseId), {
      refund_percentage: refundPercentage,
      refund_amount: refundAmount,
    });
    return response.data;
  },

  closeCase: async (caseId: number, message?: string) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.closeCase(caseId), {
      message,
    });
    return response.data;
  },

  assignUsers: async (caseId: number, userIds: number[]) => {
    const response = await apiClient.post(API_ENDPOINTS.admin.arbitration.cases.assignUsers(caseId), {
      user_ids: userIds,
    });
    return response.data;
  },

  getActivityFeed: async (caseId: number) => {
    const response = await apiClient.get(API_ENDPOINTS.admin.arbitration.cases.activityFeed(caseId));
    return response.data;
  },
};
