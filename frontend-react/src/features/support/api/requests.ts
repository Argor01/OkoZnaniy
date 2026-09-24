import { apiClient } from '@/api/client';
import type {
  CreateClaimPayload,
  CreateSupportRequestPayload,
  SupportActivityResponse,
  SupportConversation,
  SupportConversationType,
  SupportFeedItem,
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
  unread_count: item.unread_count ?? 0,
  order: null,
});

const COMPLAINT_REASONS: Record<string, string> = {
  poor_quality: 'Низкое качество работы',
  deadline_violation: 'Нарушение сроков',
  no_contact: 'Исполнитель не выходит на связь',
  not_matching: 'Работа не соответствует заданию',
  other: 'Другое',
};

const normalizeComplaint = (item: any): SupportConversation => ({
  id: item.id,
  ticket_number: `П-${item.id}`,
  type: 'complaint',
  subject: COMPLAINT_REASONS[item.complaint_type] || 'Претензия по заказу',
  description: item.description,
  status: item.status === 'resolved' ? 'completed' : item.status,
  priority: 'high',
  created_at: item.created_at,
  updated_at: item.updated_at || item.created_at,
  completed_at: item.resolved_at ?? null,
  order: item.order
    ? { id: item.order.id ?? item.order, title: item.order.title }
    : null,
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
  async reopenCase(id: number, reason: string) {
    const response = await apiClient.post(`/arbitration/cases/${id}/reopen/`, { reason });
    return response.data;
  },
  async listAll(): Promise<SupportConversation[]> {
    const [
      supportRequestsResponse,
      claimsResponse,
      arbitrationCasesResponse,
      complaintsResponse,
    ] = await Promise.allSettled([
      apiClient.get('/admin-panel/support-requests/'),
      apiClient.get('/admin-panel/claims/'),
      apiClient.get('/arbitration/cases/my-cases/'),
      // Претензии по заказам — четвёртый источник: без него поданная
      // претензия нигде не показывалась.
      apiClient.get('/arbitration/complaints/'),
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
    const complaints = complaintsResponse.status === 'fulfilled'
      ? extractItems<any>(complaintsResponse.value.data).map(normalizeComplaint)
      : [];

    return [...supportRequests, ...claims, ...arbitrationCases, ...complaints].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  async getActivity(type: SupportConversationType, id: number): Promise<SupportActivityResponse> {
    if (type === 'complaint') {
      // У претензии нет своей ленты: показываем её текст, а обсуждение
      // идёт в чате по заказу.
      const { data } = await apiClient.get(`/arbitration/complaints/${id}/`);
      const item: SupportFeedItem = {
        kind: 'message',
        id: `complaint-${id}`,
        created_at: data.created_at,
        text: data.description || '',
        source: 'ticket',
      };
      return { messages: [item], activities: [], feed: [item] };
    }

    if (type === 'arbitration_case') {
      const response = await apiClient.get(`/arbitration/cases/${id}/activity-feed/`);
      return response.data;
    }

    const response = await apiClient.get(`/admin-panel/${endpointSegment(type)}/${id}/activity/`);
    return response.data;
  },

  async sendMessage(type: SupportConversationType, id: number, message: string, files: File[] = []) {
    if (type === 'complaint') {
      // Переписка по претензии идёт в чате заказа, своей ленты у неё нет.
      throw new Error('Обсуждение претензии ведётся в чате по заказу');
    }

    if (type === 'arbitration_case') {
      const response = await apiClient.post(`/arbitration/cases/${id}/send-message/`, { message });
      return response.data;
    }

    if (type === 'support_request' && files.length > 0) {
      const formData = new FormData();
      formData.append('message', message);
      files.forEach((file) => formData.append('files', file));
      const response = await apiClient.post(
        `/admin-panel/${endpointSegment(type)}/${id}/send_message/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    }

    const response = await apiClient.post(
      `/admin-panel/${endpointSegment(type)}/${id}/send_message/`,
      { message }
    );
    return response.data;
  },

  async markRead(type: SupportConversationType, id: number) {
    if (type !== 'support_request') {
      return null;
    }

    const response = await apiClient.post(`/admin-panel/support-requests/${id}/mark_read/`);
    return response.data;
  },

  async createSupportRequest(payload: CreateSupportRequestPayload) {
    const response = await apiClient.post('/admin-panel/support-requests/', payload);
    return normalizeSupportRequest(response.data);
  },

  async createClaim(payload: CreateClaimPayload) {
    const requestedRefundPercentage =
      payload.refund_type === 'full'
        ? 100
        : payload.refund_type === 'partial'
          ? payload.refund_percentage ?? 0
          : 0;

    const response = await apiClient.post('/arbitration/cases/submit-claim/', {
      order_id: payload.order_id,
      subject: payload.subject,
      description: payload.description,
      reason: payload.reason ?? 'other',
      refund_type: payload.refund_type ?? 'none',
      requested_refund_percentage: requestedRefundPercentage,
      requested_refund_amount: null,
      deadline_relevant: payload.deadline_relevant ?? false,
      evidence_files: [],
    });
    return normalizeArbitrationCase(response.data);
  },
};
