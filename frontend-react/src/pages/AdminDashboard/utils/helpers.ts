

import type { Partner, Dispute } from '../types';


export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};


export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
};


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

type SearchableUser = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};


export const filterUsers = <T extends SearchableUser>(users: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return users;
  
  const query = searchQuery.toLowerCase();
  return users.filter(user => 
    (user.first_name || '').toLowerCase().includes(query) ||
    (user.last_name || '').toLowerCase().includes(query) ||
    (user.username || '').toLowerCase().includes(query) ||
    (user.email || '').toLowerCase().includes(query) ||
    (user.phone || '').toLowerCase().includes(query)
  );
};

type SearchableOrder = {
  id: number | string;
  title?: string | null;
  customerName?: string | null;
  expertName?: string | null;
};


export const filterOrders = <T extends SearchableOrder>(orders: T[], searchQuery: string): T[] => {
  if (!searchQuery.trim()) return orders;
  
  const query = searchQuery.toLowerCase();
  return orders.filter(order => 
    String(order.id).toLowerCase().includes(query) ||
    (order.title || '').toLowerCase().includes(query) ||
    (order.customerName || '').toLowerCase().includes(query) ||
    (order.expertName || '').toLowerCase().includes(query)
  );
};


export const filterPartners = (partners: Partner[], searchQuery: string): Partner[] => {
  if (!searchQuery.trim()) return partners;
  
  const query = searchQuery.toLowerCase();
  return partners.filter(partner => 
    partner.username.toLowerCase().includes(query) ||
    partner.email.toLowerCase().includes(query) ||
    partner.first_name.toLowerCase().includes(query) ||
    partner.last_name.toLowerCase().includes(query) ||
    partner.referral_code.toLowerCase().includes(query)
  );
};


export const filterDisputes = (disputes: Dispute[], searchQuery: string): Dispute[] => {
  if (!searchQuery.trim()) return disputes;
  
  const query = searchQuery.toLowerCase();
  return disputes.filter(dispute => 
    dispute.id.toString().includes(query) ||
    dispute.order.title.toLowerCase().includes(query) ||
    dispute.order.client.username.toLowerCase().includes(query) ||
    (dispute.order.expert?.username || '').toLowerCase().includes(query)
  );
};


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


export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};


export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};


export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};
