import apiClient from './client';
import type { Work } from '../pages/ShopReadyWorks/types';

export interface CreateWorkPayload {
  title: string;
  description: string;
  price: number;
  subject: string;
  work_type: string;
  preview?: File | null;
  files?: File[];
}

export const shopApi = {
  getWorks: async (): Promise<Work[]> => {
    const response = await apiClient.get('/shop/works/');
    return response.data.results || response.data;
  },

  createWork: async (data: CreateWorkPayload): Promise<Work> => {
    const formData = new FormData();
    
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('subject', data.subject);
    formData.append('work_type', data.work_type);
    
    if (data.preview) {
      formData.append('preview', data.preview);
    }
    
    // Добавляем файлы работы
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append(`work_files`, file);
      });
    }
    
    const response = await apiClient.post('/shop/works/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteWork: async (id: number): Promise<void> => {
    await apiClient.delete(`/shop/works/${id}/`);
  },
};
