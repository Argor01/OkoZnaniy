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

export const expertsApi = {
  async rateExpert(payload: CreateExpertRatingRequest) {
    const { data } = await apiClient.post('/experts/ratings/', payload);
    return data;
  },

  async getExpertStatistics(expertId: number): Promise<ExpertStatistics> {
    const { data } = await apiClient.get(`/experts/statistics/?expert=${expertId}`);
    return data.results?.[0] || data;
  },
};


