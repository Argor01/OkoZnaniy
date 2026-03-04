import { useState } from 'react';
import { message } from 'antd';

interface ContactViolation {
  id: number;
  chat: {
    id: number;
    context_title?: string;
  };
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  message?: {
    id: number;
    text: string;
    created_at: string;
  };
  violation_type: string;
  detected_data: any;
  risk_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  reviewed_by?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  reviewed_at?: string;
  admin_decision?: string;
  created_at: string;
  updated_at: string;
  detected_contacts_summary: string;
}

export const useAdminViolations = () => {
  const [loading, setLoading] = useState(false);

  const fetchViolations = async (status?: string): Promise<ContactViolation[]> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = status 
        ? `/api/chat/violations/?status=${status}`
        : '/api/chat/violations/';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки нарушений');
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Ошибка загрузки нарушений:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingViolations = async (): Promise<ContactViolation[]> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/violations/pending_violations/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки ожидающих нарушений');
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка загрузки ожидающих нарушений:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const approveViolation = async (violationId: number, decision: string): Promise<void> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/violations/${violationId}/approve_violation/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка одобрения нарушения');
      }

      message.success('Нарушение одобрено, чат разморожен');
    } catch (error) {
      console.error('Ошибка одобрения нарушения:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const rejectViolation = async (violationId: number, decision: string): Promise<void> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/violations/${violationId}/reject_violation/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка отклонения нарушения');
      }

      message.success('Нарушение отклонено, чат остается замороженным');
    } catch (error) {
      console.error('Ошибка отклонения нарушения:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getViolationDetails = async (violationId: number): Promise<ContactViolation> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/violations/${violationId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки деталей нарушения');
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка загрузки деталей нарушения:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchViolations,
    fetchPendingViolations,
    approveViolation,
    rejectViolation,
    getViolationDetails,
  };
};