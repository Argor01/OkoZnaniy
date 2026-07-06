import { apiClient } from '@/api/client';

export interface PartnerApplicationPayload {
  full_name: string;
  email: string;
  telegram?: string;
  phone?: string;
  comment?: string;
}

export interface PartnerApplication {
  id: number;
  full_name: string;
  email: string;
  telegram: string;
  phone: string;
  comment: string;
  status: 'new' | 'contacted' | 'approved' | 'rejected';
  status_display: string;
  director_note: string;
  processed_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export const partnerApplicationsApi = {
  create: async (payload: PartnerApplicationPayload) => {
    const { data } = await apiClient.post('/partners/applications/', payload);
    return data;
  },
  list: async (status?: string): Promise<PartnerApplication[]> => {
    const { data } = await apiClient.get('/partners/applications/', {
      params: status ? { status } : undefined,
    });
    return Array.isArray(data) ? data : (data?.results ?? []);
  },
  update: async (id: number, payload: Partial<Pick<PartnerApplication, 'status' | 'director_note'>>) => {
    const { data } = await apiClient.patch(`/partners/applications/${id}/`, payload);
    return data;
  },
};
