import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';

export type ImprovementArea = 'ui_ux' | 'functionality' | 'performance' | 'content' | 'support' | 'other';

export interface ImprovementSuggestion {
  id: number;
  user_id: number;
  username: string;
  role: string;
  avatar: string | null;
  email: string | null;
  area: ImprovementArea;
  area_display: string;
  comment: string;
  created_at: string;
}

export const improvementApi = {
  submitSuggestion: async (payload: { area: ImprovementArea; comment: string }) => {
    const response = await apiClient.post<ImprovementSuggestion>(API_ENDPOINTS.users.submitImprovementSuggestion, payload);
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
