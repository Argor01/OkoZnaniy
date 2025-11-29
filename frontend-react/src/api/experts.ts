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
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSpecializationRequest {
  subject_id: number;
  experience_years: number;
  hourly_rate: number;
  description?: string;
}

export const expertsApi = {
  async rateExpert(payload: CreateExpertRatingRequest) {
    const { data } = await apiClient.post('/experts/ratings/', payload);
    return data;
  },

  async getExpertStatistics(expertId: number): Promise<ExpertStatistics> {
    const { data } = await apiClient.get(`/experts/statistics/?expert=${expertId}`);
    return data.results?.[0] || data;
  },

  async getMyApplication(): Promise<ExpertApplication | null> {
    try {
      const { data } = await apiClient.get('/experts/applications/my_application/');
      return data;
    } catch (error: any) {
      // Если анкета не найдена (404), это нормально - значит её ещё нет
      if (error.response?.status === 404 || error.response?.status === 403) {
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


