import apiClient from '@/api/client';
import { Bid, CreateOrderRequest, Order, OrderComment, OrderFile } from '@/features/orders/types/orders';
import { API_ENDPOINTS } from '@/config/endpoints';

const isDebugEnabled = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('debug_api') === '1';

export type { Bid, CreateOrderRequest, Order, OrderComment, OrderFile };

export const ordersApi = {
  
  getClientOrders: async (params?: { status?: string; ordering?: string; inactive?: string | boolean }) => {
    const response = await apiClient.get(API_ENDPOINTS.orders.clientOrders, { params });
    return response.data;
  },

  
  getAvailableOrders: async (params?: { ordering?: string }) => {
    const response = await apiClient.get(API_ENDPOINTS.orders.available, { params });
    return response.data.results || response.data;
  },

  
  getMyOrders: async (params?: { status?: string; ordering?: string }) => {
    const response = await apiClient.get(API_ENDPOINTS.orders.list, { params });
    return response.data.results || response.data;
  },

  
  createOrder: async (data: CreateOrderRequest) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.list, data);
    return response.data;
  },

  
  getById: async (id: number) => {
    const response = await apiClient.get(API_ENDPOINTS.orders.detail(id));
    return response.data;
  },

  
  getOrder: async (id: number) => {
    const response = await apiClient.get(API_ENDPOINTS.orders.detail(id));
    return response.data;
  },

  
  updateOrder: async (id: number, data: Partial<CreateOrderRequest>) => {
    const response = await apiClient.patch(API_ENDPOINTS.orders.detail(id), data);
    return response.data;
  },

  
  deleteOrder: async (id: number) => {
    const response = await apiClient.delete(API_ENDPOINTS.orders.detail(id));
    return response.data;
  },

  
  takeOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.take(id));
    return response.data;
  },

  
  completeOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.complete(id));
    return response.data;
  },

  
  submitOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.submit(id));
    return response.data;
  },

  reactivateOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.reactivate(id));
    return response.data;
  },

  
  approveOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.approve(id));
    return response.data;
  },

  
  requestRevision: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.revision(id));
    return response.data;
  },

  rejectOrder: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.reject(id));
    return response.data;
  },

  
  extendDeadline: async (id: number, deadline: string) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.extendDeadline(id), { deadline });
    return response.data;
  },

  
  cancelOverdue: async (id: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.cancelOverdue(id));
    return response.data;
  },

  
  uploadOrderFile: async (
    orderId: number,
    file: File,
    options?: { file_type?: 'task' | 'solution' | 'revision'; description?: string }
  ) => {
    if (isDebugEnabled()) {
      console.log('📤 uploadOrderFile вызван:', {
        orderId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        options,
      });
    }
    
    const form = new FormData();
    form.append('file', file);
    form.append('file_type', options?.file_type || 'solution');
    if (options?.description) form.append('description', options.description);
    
    if (isDebugEnabled()) console.log('📦 FormData подготовлена, отправляем на сервер...');
    
    const response = await apiClient.post(
      API_ENDPOINTS.orders.uploadFile(orderId),
      form
    );
    
    if (isDebugEnabled()) console.log('✅ Файл успешно загружен на сервер:', response.data);
    return response.data;
  },

  
  getBids: async (orderId: number): Promise<Bid[]> => {
    const response = await apiClient.get(API_ENDPOINTS.orders.bids(orderId));
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  
  placeBid: async (orderId: number, data: { amount: number; prepayment_percent: number; comment?: string }): Promise<Bid> => {
    const response = await apiClient.post(API_ENDPOINTS.orders.bids(orderId), data);
    return response.data;
  },

  
  acceptBid: async (orderId: number, bidId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.acceptBid(orderId), { bid_id: bidId });
    return response.data;
  },

  
  rejectBid: async (orderId: number, bidId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.rejectBid(orderId), { bid_id: bidId });
    return response.data;
  },

  
  cancelBid: async (orderId: number) => {
    const response = await apiClient.post(API_ENDPOINTS.orders.cancelBid(orderId));
    return response.data;
  },

  
  getComments: async (orderId: number): Promise<OrderComment[]> => {
    const response = await apiClient.get(API_ENDPOINTS.orders.comments(orderId));
    return response.data;
  },

  
  addComment: async (orderId: number, text: string): Promise<OrderComment> => {
    const response = await apiClient.post(API_ENDPOINTS.orders.comments(orderId), { text });
    return response.data;
  },

  downloadOrderFile: async (orderId: number, fileId: number): Promise<Blob> => {
    const response = await apiClient.get(API_ENDPOINTS.orders.downloadFile(orderId, fileId), {
      responseType: 'blob',
    });
    return response.data;
  },
};
