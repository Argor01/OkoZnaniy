import apiClient from './client';
import type { Work } from '../pages/ShopReadyWorks/types';

export interface CreateWorkPayload {
  title: string;
  description: string;
  price: number;
  subject: string;
  work_type: string;
  preview?: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
}

export const shopApi = {
  getWorks: async (): Promise<Work[]> => {
    const response = await apiClient.get('/shop/works/');
    return response.data.results || response.data;
  },

  createWork: async (data: CreateWorkPayload): Promise<Work> => {
    const response = await apiClient.post('/shop/works/', data);
    return response.data;
  },

  deleteWork: async (id: number): Promise<void> => {
    await apiClient.delete(`/shop/works/${id}/`);
  },
};
