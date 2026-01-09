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
    console.log('🔍 Запрос предметов...');
    try {
      const response = await apiClient.get('/catalog/subjects/');
      console.log('✅ Предметы получены:', response.data.results?.length || response.data.length);
      return response.data.results || response.data;
    } catch (error) {
      console.error('❌ Ошибка получения предметов:', error);
      throw error;
    }
  },

  // Получить темы по предмету
  getTopics: async (subjectId?: number): Promise<Topic[]> => {
    const params = subjectId ? { subject: subjectId } : {};
    const response = await apiClient.get('/catalog/topics/', { params });
    return response.data.results || response.data;
  },

  // Получить типы работ
  getWorkTypes: async (): Promise<WorkType[]> => {
    console.log('🔍 Запрос типов работ...');
    try {
      const response = await apiClient.get('/catalog/work-types/');
      console.log('✅ Типы работ получены:', response.data.results?.length || response.data.length);
      return response.data.results || response.data;
    } catch (error) {
      console.error('❌ Ошибка получения типов работ:', error);
      throw error;
    }
  },

  // Создать новый предмет
  createSubject: async (name: string): Promise<Subject> => {
    console.log('🆕 Создание нового предмета:', name);
    try {
      const response = await apiClient.post('/catalog/subjects/', {
        name: name.trim(),
        description: `Предмет "${name.trim()}" добавлен пользователем`,
        is_active: true
      });
      console.log('✅ Предмет создан:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка создания предмета:', error);
      throw error;
    }
  },

  // Создать новый тип работы
  createWorkType: async (name: string): Promise<WorkType> => {
    console.log('🆕 Создание нового типа работы:', name);
    try {
      const response = await apiClient.post('/catalog/work-types/', {
        name: name.trim(),
        description: `Тип работы "${name.trim()}" добавлен пользователем`,
        is_active: true,
        base_price: 1000,
        estimated_time: 7
      });
      console.log('✅ Тип работы создан:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка создания типа работы:', error);
      throw error;
    }
  },
};
