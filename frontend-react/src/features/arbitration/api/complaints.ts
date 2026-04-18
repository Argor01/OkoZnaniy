import apiClient from '@/api/client';

export interface Complaint {
  id: number;
  order_id: number;
  plaintiff_id: number;
  defendant_id: number;
  complaint_type: string;
  is_order_relevant: boolean;
  relevant_until?: string;
  financial_requirement: string;
  refund_percent?: number;
  description: string;
  files?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_type?: string;
  }>;
  status: 'open' | 'closed' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  resolution?: string;
  plaintiff?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
  defendant?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
  order?: {
    id: number;
    title?: string;
    budget?: string | number;
    subject?: { name?: string };
    work_type?: { name?: string };
    is_frozen?: boolean;
    frozen_reason?: string;
  };
  chat_id?: number;
}

export interface CreateComplaintRequest {
  order_id: number;
  complaint_type: string;
  is_order_relevant: boolean;
  relevant_until?: string;
  financial_requirement: string;
  refund_percent?: number;
  description: string;
  files?: File[];
}

export interface UpdateComplaintRequest {
  status?: Complaint['status'];
  resolution?: string;
}

class ComplaintsApi {
  private baseUrl = '/arbitration/complaints/';

  async getAll(): Promise<Complaint[]> {
    const response = await apiClient.get(this.baseUrl);
    return response.data;
  }

  async getById(id: number): Promise<Complaint> {
    const response = await apiClient.get(`${this.baseUrl}${id}/`);
    return response.data;
  }

  async getByOrderId(orderId: number): Promise<Complaint[]> {
    const response = await apiClient.get(`${this.baseUrl}?order_id=${orderId}`);
    return response.data;
  }

  async create(data: CreateComplaintRequest): Promise<Complaint> {
    const formData = new FormData();
    formData.append('order_id', String(data.order_id));
    formData.append('complaint_type', data.complaint_type);
    formData.append('is_order_relevant', String(data.is_order_relevant));
    if (data.relevant_until) formData.append('relevant_until', data.relevant_until);
    formData.append('financial_requirement', data.financial_requirement);
    if (typeof data.refund_percent === 'number') {
      formData.append('refund_percent', String(data.refund_percent));
    }
    formData.append('description', data.description);
    if (data.files?.length) {
      data.files.forEach((file) => formData.append('files_upload', file));
    }

    const response = await apiClient.post(this.baseUrl, formData);
    return response.data;
  }

  async update(id: number, data: UpdateComplaintRequest): Promise<Complaint> {
    const response = await apiClient.patch(`${this.baseUrl}${id}/`, data);
    return response.data;
  }

  async close(id: number, resolution?: string): Promise<Complaint> {
    const response = await apiClient.patch(`${this.baseUrl}${id}/close/`, { resolution });
    return response.data;
  }

  async getChat(complaintId: number) {
    const response = await apiClient.get(`${this.baseUrl}${complaintId}/chat/`);
    return response.data;
  }
}

export const complaintsApi = new ComplaintsApi();
