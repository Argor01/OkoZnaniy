import apiClient from '@/api/client';
import { Complexity, Skill, Subject, Topic, WorkType } from '@/features/common/types/catalog';

export type { Complexity, Skill, Subject, Topic, WorkType };

export const catalogApi = {
  getSkills: async (): Promise<Skill[]> => {
    const response = await apiClient.get('/catalog/skills/');
    return response.data.results || response.data;
  },

  createSkill: async (name: string): Promise<Skill> => {
    const response = await apiClient.post('/catalog/skills/', { name: name.trim() });
    return response.data;
  },

  
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

  
  getTopics: async (subjectId?: number): Promise<Topic[]> => {
    const params = subjectId ? { subject: subjectId } : {};
    const response = await apiClient.get('/catalog/topics/', { params });
    return response.data.results || response.data;
  },

  
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
