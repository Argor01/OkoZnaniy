/**
 * Вспомогательные утилиты для админ-панели
 */

import { User, Order, Partner, Dispute } from '../types';

/**
 * Генерирует уникальный ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Задержка для имитации загрузки
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Копирует текст в буфер обмена
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
};

/**
 * Скачивает данные как JSON файл
 */
export const downloadAsJson = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Скачивает данные как CSV файл
 */
export const downloadAsCsv = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Дебаунс функции
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Фильтрует пользователей по поисковому запросу
 */
export const filterUsers = (users: User[], searchQuery: string): User[] => {
  if (!searchQuery.trim()) return users;
  
  const query = searchQuery.toLowerCase();
  return users.filter(user => 
    user.firstName.toLowerCase().includes(query) ||
    user.lastName.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    user.phone?.toLowerCase().includes(query)
  );
};

/**
 * Фильтрует заказы по поисковому запросу
 */
export const filterOrders = (orders: Order[], searchQuery: string): Order[] => {
  if (!searchQuery.trim()) return orders;
  
  const query = searchQuery.toLowerCase();
  return orders.filter(order => 
    order.id.toString().includes(query) ||
    order.title.toLowerCase().includes(query) ||
    order.customerName.toLowerCase().includes(query) ||
    order.expertName?.toLowerCase().includes(query)
  );
};

/**
 * Фильтрует партнеров по поисковому запросу
 */
export const filterPartners = (partners: Partner[], searchQuery: string): Partner[] => {
  if (!searchQuery.trim()) return partners;
  
  const query = searchQuery.toLowerCase();
  return partners.filter(partner => 
    partner.name.toLowerCase().includes(query) ||
    partner.email.toLowerCase().includes(query) ||
    partner.company?.toLowerCase().includes(query)
  );
};

/**
 * Фильтрует споры по поисковому запросу
 */
export const filterDisputes = (disputes: Dispute[], searchQuery: string): Dispute[] => {
  if (!searchQuery.trim()) return disputes;
  
  const query = searchQuery.toLowerCase();
  return disputes.filter(dispute => 
    dispute.id.toString().includes(query) ||
    dispute.title.toLowerCase().includes(query) ||
    dispute.customerName.toLowerCase().includes(query) ||
    dispute.expertName.toLowerCase().includes(query)
  );
};

/**
 * Сортирует массив по указанному полю
 */
export const sortBy = <T>(
  array: T[], 
  key: keyof T, 
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Группирует массив по указанному полю
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Проверяет, является ли значение пустым
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Безопасно парсит JSON
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};