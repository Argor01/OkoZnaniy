import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

export type ImprovementArea = 'ui_ux' | 'functionality' | 'performance' | 'content' | 'support' | 'other';

export interface ImprovementSuggestion {
  id: number;
  user_id: number;
  username: string;
  display_username?: string;
  role: string;
  avatar: string | null;
  email: string | null;
  area: ImprovementArea;
  area_display: string;
  comment: string;
  attachment: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export const improvementApi = {
  submitSuggestion: async (payload: { area: ImprovementArea; comment: string; attachment?: File | null }) => {
    const formData = new FormData();
    formData.append('area', payload.area);
    formData.append('comment', payload.comment);
    if (payload.attachment) {
      formData.append('attachment', payload.attachment);
    }

    const response = await apiClient.post<ImprovementSuggestion>(API_ENDPOINTS.users.submitImprovementSuggestion, formData);
    return response.data;
  },

  getSuggestions: async () => {
    const response = await apiClient.get<{ results?: ImprovementSuggestion[] } | ImprovementSuggestion[]>(
      API_ENDPOINTS.users.improvementSuggestions
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.results || [];
  },
};