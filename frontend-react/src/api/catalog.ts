import apiClient from './client';

export interface Subject {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  icon: string;
  is_active: boolean;
  min_price: string;
  topics_count: number;
  active_topics_count: number;
  experts_count: number;
  verified_experts_count: number;
  orders_count: number;
  completed_orders_count: number;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string;
  subject: number;
  subject_name: string;
  is_active: boolean;
}

export interface WorkType {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
}

export interface Complexity {
  id: number;
  name: string;
  slug: string;
  description: string;
  multiplier: number;
  is_active: boolean;
}

export const catalogApi = {
  // Получить все предметы
  getSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get('/catalog/subjects/');
    return response.data.results || response.data;
  },

  // Получить темы по предмету
  getTopics: async (subjectId?: number): Promise<Topic[]> => {
    const params = subjectId ? { subject: subjectId } : {};
    const response = await apiClient.get('/catalog/topics/', { params });
    return response.data.results || response.data;
  },

  // Получить типы работ
  getWorkTypes: async (): Promise<WorkType[]> => {
    const response = await apiClient.get('/catalog/work-types/');
    return response.data.results || response.data;
  },

  // Получить уровни сложности
  getComplexities: async (): Promise<Complexity[]> => {
    const response = await apiClient.get('/catalog/complexities/');
    return response.data.results || response.data;
  },
};
