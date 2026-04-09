import { apiClient } from '@/api/client';
import type {
  CreateClaimPayload,
  CreateSupportRequestPayload,
  SupportActivityResponse,
  SupportConversation,
  SupportConversationType,
} from '@/features/support/types/requests';

const normalizeSupportRequest = (item: any): SupportConversation => ({
  id: item.id,
  ticket_number: item.ticket_number,
  type: 'support_request',
  subject: item.subject,
  description: item.description,
  status: item.status,
  priority: item.priority,
  created_at: item.created_at,
  updated_at: item.updated_at,
  completed_at: item.completed_at,
  order: null,
});

const normalizeClaim = (item: any): SupportConversation => ({
  id: item.id,
  ticket_number: item.ticket_number,
  type: 'claim',
  subject: item.subject,
  description: item.description,
  status: item.status,
  priority: item.priority,
  created_at: item.created_at,
  updated_at: item.updated_at,
  completed_at: item.completed_at,
  order: item.order
    ? {
        id: item.order.id,
        title: item.order.title,
      }
    : null,
});

const normalizeArbitrationCase = (item: any): SupportConversation => ({
  id: item.id,
  ticket_number: item.case_number,
  type: 'arbitration_case',
  subject: item.subject,
  description: item.description,
  status: item.status,
  priority: item.priority,
  created_at: item.created_at,
  updated_at: item.updated_at,
  completed_at: item.closed_at,
  order: item.order
    ? {
        id: item.order.id,
        title: item.order.title,
      }
    : null,
});

const endpointSegment = (type: SupportConversationType) =>
  type === 'support_request'
    ? 'support-requests'
    : type === 'claim'
      ? 'claims'
      : null;

const extractItems = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const maybeResults = (payload as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults as T[];
    }
  }

  return [];
};

export const supportRequestsApi = {
  async listAll(): Promise<SupportConversation[]> {
    const [supportRequestsResponse, claimsResponse, arbitrationCasesResponse] = await Promise.allSettled([
      apiClient.get('/admin-panel/support-requests/'),
      apiClient.get('/admin-panel/claims/'),
      apiClient.get('/arbitration/cases/my-cases/'),
    ]);

    const supportRequests = supportRequestsResponse.status === 'fulfilled'
      ? extractItems<any>(supportRequestsResponse.value.data).map(normalizeSupportRequest)
      : [];
    const claims = claimsResponse.status === 'fulfilled'
      ? extractItems<any>(claimsResponse.value.data).map(normalizeClaim)
      : [];
    const arbitrationCases = arbitrationCasesResponse.status === 'fulfilled'
      ? extractItems<any>(arbitrationCasesResponse.value.data).map(normalizeArbitrationCase)
      : [];

    return [...supportRequests, ...claims, ...arbitrationCases].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  async getActivity(type: SupportConversationType, id: number): Promise<SupportActivityResponse> {
    if (type === 'arbitration_case') {
      const response = await apiClient.get(`/arbitration/cases/${id}/activity-feed/`);
      return response.data;
    }

    const response = await apiClient.get(`/admin-panel/${endpointSegment(type)}/${id}/activity/`);
    return response.data;
  },

  async sendMessage(type: SupportConversationType, id: number, message: string) {
    if (type === 'arbitration_case') {
      const response = await apiClient.post(`/arbitration/cases/${id}/send-message/`, { message });
      return response.data;
    }

    const response = await apiClient.post(
      `/admin-panel/${endpointSegment(type)}/${id}/send_message/`,
      { message }
    );
    return response.data;
  },

  async createSupportRequest(payload: CreateSupportRequestPayload) {
    const response = await apiClient.post('/admin-panel/support-requests/', payload);
    return normalizeSupportRequest(response.data);
  },

  async createClaim(payload: CreateClaimPayload) {
    const response = await apiClient.post('/arbitration/cases/submit-claim/', {
      order_id: payload.order_id,
      subject: payload.subject,
      description: payload.description,
      reason: payload.reason ?? 'other',
      refund_type: payload.refund_type ?? 'none',
      requested_refund_percentage: payload.refund_type === 'partial' ? payload.refund_percentage ?? 0 : 0,
      requested_refund_amount: null,
      deadline_relevant: false,
      evidence_files: [],
    });
    return normalizeArbitrationCase(response.data);
  },
};
