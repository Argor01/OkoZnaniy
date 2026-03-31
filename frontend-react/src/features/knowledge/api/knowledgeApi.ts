import axios from 'axios';
import { API_URL } from '@/config/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  subjects_count?: number;
  active_subjects_count?: number;
}

export const knowledgeApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await axios.get(`${API_URL}/catalog/categories/`);
    return response.data;
  },
};
