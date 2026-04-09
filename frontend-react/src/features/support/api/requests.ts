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

const endpointSegment = (type: SupportConversationType) =>
  type === 'support_request' ? 'support-requests' : 'claims';

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
    const [supportRequestsResponse, claimsResponse] = await Promise.allSettled([
      apiClient.get('/admin-panel/support-requests/'),
      apiClient.get('/admin-panel/claims/'),
    ]);

    const supportRequests = supportRequestsResponse.status === 'fulfilled'
      ? extractItems<any>(supportRequestsResponse.value.data).map(normalizeSupportRequest)
      : [];
    const claims = claimsResponse.status === 'fulfilled'
      ? extractItems<any>(claimsResponse.value.data).map(normalizeClaim)
      : [];

    return [...supportRequests, ...claims].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  async getActivity(type: SupportConversationType, id: number): Promise<SupportActivityResponse> {
    const response = await apiClient.get(`/admin-panel/${endpointSegment(type)}/${id}/activity/`);
    return response.data;
  },

  async sendMessage(type: SupportConversationType, id: number, message: string) {
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
    const response = await apiClient.post('/admin-panel/claims/', payload);
    return normalizeClaim(response.data);
  },
};
