import { apiClient } from './client';

export interface CreateExpertRatingRequest {
  order: number;
  rating: number; // 1-5
  comment?: string;
}

export interface ExpertStatistics {
  id: number;
  expert: number;
  total_orders: number;
  completed_orders: number;
  average_rating: number;
  success_rate: number;
  total_earnings: number;
  response_time_avg: number;
  last_updated: string;
}

export interface Education {
  id?: number;
  university: string;
  start_year: number;
  end_year?: number | null;
  degree?: string;
}

export interface ExpertApplication {
  id: number;
  expert: number;
  full_name: string;
  work_experience_years: number;
  specializations: string;
  educations: Education[];
  status: 'pending' | 'approved' | 'rejected';
  status_display: string;
  rejection_reason?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpertApplicationRequest {
  full_name: string;
  work_experience_years: number;
  specializations: string;
  educations: Education[];
}

export interface Specialization {
  id: number;
  expert: number;
  subject: {
    id: number;
    name: string;
    slug?: string;
  };
  subject_id?: number;
  experience_years: number;
  hourly_rate: number;
  description?: string;
  skills?: string;
  is_verified: boolean;
  custom_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSpecializationRequest {
  subject_id?: number;
  custom_name?: string;
  experience_years: number;
  hourly_rate: number;
  description?: string;
  skills?: string;
}

export interface ExpertReview {
  id: number;
  expert?: number;
  client: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  order: {
    id: number;
    title: string;
  };
  rating: number;
  comment?: string;
  text?: string;
  created_at: string;
}

export const expertsApi = {
  async getReviews(expertId?: number): Promise<ExpertReview[]> {
    const params = expertId ? { expert: expertId } : {};
    const { data } = await apiClient.get('/experts/ratings/', { params });
    const raw: unknown = (data as { results?: unknown })?.results ?? data;
    const items: unknown[] = Array.isArray(raw) ? raw : [];
    return items.map((r) => {
      const rr = r as Partial<ExpertReview> & { comment?: unknown; text?: unknown };
      const comment = typeof rr.comment === 'string' ? rr.comment : undefined;
      const text = typeof rr.text === 'string' ? rr.text : undefined;
      return {
        ...(rr as ExpertReview),
        comment,
        text: text ?? comment ?? '',
      };
    });
  },

  async rateExpert(payload: CreateExpertRatingRequest) {
    const { data } = await apiClient.post('/experts/ratings/', payload);
    return data;
  },

  async getExpertStatistics(expertId: number): Promise<ExpertStatistics> {
    const { data } = await apiClient.get(`/experts/statistics/?expert=${expertId}`);
    const raw = data?.results?.[0] || data;
    if (!raw || typeof raw !== 'object') return raw;
    const average_rating_raw = (raw as { average_rating?: unknown }).average_rating;
    const average_rating =
      typeof average_rating_raw === 'number'
        ? average_rating_raw
        : typeof average_rating_raw === 'string'
          ? Number(average_rating_raw)
          : 0;
    return {
      ...(raw as ExpertStatistics),
      average_rating: Number.isFinite(average_rating) ? average_rating : 0,
    };
  },

  async getMyApplication(): Promise<ExpertApplication | null> {
    try {
      const { data } = await apiClient.get('/experts/applications/my_application/');
      // Если сервер вернул null, значит анкеты нет
      return data;
    } catch (error: unknown) {
      // Если анкета не найдена (404 или 400), это нормально - значит её ещё нет
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403 || status === 400) {
        return null;
      }
      throw error;
    }
  },

  async createApplication(payload: CreateExpertApplicationRequest): Promise<ExpertApplication> {
    const { data } = await apiClient.post('/experts/applications/', payload);
    return data;
  },

  // Специализации
  async getSpecializations(): Promise<Specialization[]> {
    const { data } = await apiClient.get('/experts/specializations/');
    return data.results || data;
  },

  async createSpecialization(payload: CreateSpecializationRequest): Promise<Specialization> {
    const { data } = await apiClient.post('/experts/specializations/', payload);
    return data;
  },

  async updateSpecialization(id: number, payload: Partial<CreateSpecializationRequest>): Promise<Specialization> {
    const { data } = await apiClient.patch(`/experts/specializations/${id}/`, payload);
    return data;
  },

  async deleteSpecialization(id: number): Promise<void> {
    await apiClient.delete(`/experts/specializations/${id}/`);
  },
};


