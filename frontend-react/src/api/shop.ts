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

export interface Purchase {
  id: number;
  work: number;
  work_title?: string;
  work_detail?: Work;
  price_paid: string | number;
  rating?: number | null;
  rated_at?: string | null;
  delivered_file_available?: boolean;
  delivered_file_name?: string;
  delivered_file_type?: string;
  delivered_file_size?: number;
  created_at: string;
}

export const shopApi = {
  getWorks: async (): Promise<Work[]> => {
    const response = await apiClient.get('/shop/works/');
    return response.data.results || response.data;
  },

  purchaseWork: async (workId: number): Promise<Purchase> => {
    const response = await apiClient.post(`/shop/works/${workId}/purchase/`);
    return response.data;
  },

  getPurchases: async (): Promise<Purchase[]> => {
    const response = await apiClient.get('/shop/purchases/');
    return response.data.results || response.data;
  },

  ratePurchase: async (purchaseId: number, rating: number): Promise<Purchase> => {
    const response = await apiClient.post(`/shop/purchases/${purchaseId}/rate/`, { rating });
    return response.data;
  },

  downloadPurchaseFile: async (purchaseId: number): Promise<Blob> => {
    const response = await apiClient.get(`/shop/purchases/${purchaseId}/download/`, {
      responseType: 'blob',
    });
    return response.data;
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
