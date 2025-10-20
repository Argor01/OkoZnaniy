import { apiClient } from './client';

export interface OrderFile {
  id: number;
  file_url: string | null;
  filename: string;
  file_type: string;
  file_type_display: string;
  uploaded_by: { id: number; username: string };
  description?: string | null;
  created_at: string;
  file_size?: string;
}

export interface Order {
  id: number;
  title: string;
  description: string;
  budget: string;
  deadline: string;
  status: string;
  subject: {
    id: number;
    name: string;
  };
  topic: {
    id: number;
    name: string;
  };
  work_type: {
    id: number;
    name: string;
  };
  complexity: {
    id: number;
    name: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  files?: OrderFile[];
  bids?: Bid[];
  expert_rating?: {
    id: number;
    rating: number;
    comment?: string;
    created_at: string;
  };
  dispute?: {
    id: number;
    resolved: boolean;
  };
}

export interface CreateOrderRequest {
  title: string;
  description: string;
  deadline: string;
  subject_id: number;
  custom_topic: string;
  work_type_id: number;
  budget: number;
  additional_requirements?: any;
}

export interface Bid {
  id: number;
  order: number;
  expert: { id: number; username: string };
  amount: string;
  comment?: string;
  created_at: string;
}

export interface OrderComment {
  id: number;
  text: string;
  created_at: string;
  author: { id: number; username: string };
}

export const ordersApi = {
  // Получить заказы клиента
  getClientOrders: async (params?: { status?: string; ordering?: string }) => {
    const response = await apiClient.get('/users/client_orders/', { params });
    return response.data;
  },

  // Доступные заказы для эксперта
  getAvailableOrders: async (params?: { ordering?: string }) => {
    const response = await apiClient.get('/orders/orders/available/', { params });
    return response.data.results || response.data;
  },

  // Мои заказы (фильтры по статусу)
  getMyOrders: async (params?: { status?: string; ordering?: string }) => {
    const response = await apiClient.get('/orders/orders/', { params });
    return response.data.results || response.data;
  },

  // Создать заказ
  createOrder: async (data: CreateOrderRequest) => {
    const response = await apiClient.post('/orders/orders/', data);
    return response.data;
  },

  // Получить заказ по ID
  getOrder: async (id: number) => {
    const response = await apiClient.get(`/orders/orders/${id}/`);
    return response.data;
  },

  // Обновить заказ
  updateOrder: async (id: number, data: Partial<CreateOrderRequest>) => {
    const response = await apiClient.patch(`/orders/orders/${id}/`, data);
    return response.data;
  },

  // Взять заказ в работу (для экспертов)
  takeOrder: async (id: number) => {
    const response = await apiClient.post(`/orders/orders/${id}/take/`);
    return response.data;
  },

  // Завершить заказ (для экспертов)
  completeOrder: async (id: number) => {
    const response = await apiClient.post(`/orders/orders/${id}/complete/`);
    return response.data;
  },

  // Отправить на проверку (эксперт)
  submitOrder: async (id: number) => {
    const response = await apiClient.post(`/orders/orders/${id}/submit/`);
    return response.data;
  },

  // Принять работу (клиент)
  approveOrder: async (id: number) => {
    const response = await apiClient.post(`/orders/orders/${id}/approve/`);
    return response.data;
  },

  // Отправить на доработку (клиент)
  requestRevision: async (id: number) => {
    const response = await apiClient.post(`/orders/orders/${id}/revision/`);
    return response.data;
  },

  // Загрузка файла к заказу (клиент/эксперт)
  uploadOrderFile: async (
    orderId: number,
    file: File,
    options?: { file_type?: 'task' | 'solution' | 'revision'; description?: string }
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('file_type', options?.file_type || 'solution');
    if (options?.description) form.append('description', options.description);
    const response = await apiClient.post(
      `/orders/orders/${orderId}/files/`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Ставки экспертов: получить список
  getBids: async (orderId: number): Promise<Bid[]> => {
    const response = await apiClient.get(`/orders/orders/${orderId}/bids/`);
    return response.data;
  },

  // Ставка эксперта: создать/обновить
  placeBid: async (orderId: number, data: { amount: number; comment?: string }): Promise<Bid> => {
    const response = await apiClient.post(`/orders/orders/${orderId}/bids/`, data);
    return response.data;
  },

  // Клиент принимает ставку
  acceptBid: async (orderId: number, bidId: number) => {
    const response = await apiClient.post(`/orders/orders/${orderId}/accept_bid/`, { bid_id: bidId });
    return response.data;
  },

  // Комментарии (чат): список
  getComments: async (orderId: number): Promise<OrderComment[]> => {
    const response = await apiClient.get(`/orders/orders/${orderId}/comments/`);
    return response.data;
  },

  // Комментарии (чат): отправить сообщение
  addComment: async (orderId: number, text: string): Promise<OrderComment> => {
    const response = await apiClient.post(`/orders/orders/${orderId}/comments/`, { text });
    return response.data;
  },
};