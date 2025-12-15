import axios from 'axios';
import { API_URL } from '../config/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ChatMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  text: string;
  created_at: string;
}

export interface Chat {
  id: number;
  order: number;
  participants: any[];
  messages: ChatMessage[];
  last_message: ChatMessage | null;
  unread_count: number;
}

export const chatApi = {
  // Получить все чаты пользователя
  getChats: async (): Promise<Chat[]> => {
    const response = await api.get('/chat/chats/');
    return response.data;
  },

  // Получить сообщения конкретного чата
  getMessages: async (chatId: number): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/chats/${chatId}/messages/`);
    return response.data;
  },

  // Отправить сообщение
  sendMessage: async (chatId: number, text: string): Promise<ChatMessage> => {
    const response = await api.post(`/chat/chats/${chatId}/send_message/`, { text });
    return response.data;
  },

  // Создать чат для заказа
  createChat: async (orderId: number): Promise<Chat> => {
    const response = await api.post('/chat/chats/', { order: orderId });
    return response.data;
  },
};

export default chatApi;
