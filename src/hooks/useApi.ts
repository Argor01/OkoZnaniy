import { api } from '@/services/api';
import { message } from 'antd';
import { AxiosError } from 'axios';

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export const useApi = () => {
  const handleError = (error: AxiosError<ApiError>) => {
    if (error.response?.data) {
      const { message: errorMessage, errors } = error.response.data;
      
      if (errors) {
        Object.values(errors).forEach((messages: string[]) => {
          messages.forEach((msg: string) => message.error(msg));
        });
      } else if (errorMessage) {
        message.error(errorMessage);
      }
    } else {
      message.error('Произошла ошибка при выполнении запроса');
    }
  };

  return {
    async get<T>(url: string) {
      try {
        const response = await api.get<T>(url);
        return response.data;
      } catch (error) {
        handleError(error as AxiosError<ApiError>);
        throw error;
      }
    },

    async post<T>(url: string, data?: unknown) {
      try {
        const response = await api.post<T>(url, data);
        return response.data;
      } catch (error) {
        handleError(error as AxiosError<ApiError>);
        throw error;
      }
    },

    async put<T>(url: string, data: unknown) {
      try {
        const response = await api.put<T>(url, data);
        return response.data;
      } catch (error) {
        handleError(error as AxiosError<ApiError>);
        throw error;
      }
    },

    async patch<T>(url: string, data: unknown) {
      try {
        const response = await api.patch<T>(url, data);
        return response.data;
      } catch (error) {
        handleError(error as AxiosError<ApiError>);
        throw error;
      }
    },

    async delete(url: string) {
      try {
        await api.delete(url);
      } catch (error) {
        handleError(error as AxiosError<ApiError>);
        throw error;
      }
    },
  };
}; 