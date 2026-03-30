import { useState, useEffect } from 'react';
import { message } from 'antd';
import { apiClient } from '@/utils/api';

interface ArbitrationCase {
  id: number;
  case_number: string;
  plaintiff: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  defendant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  subject: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  reason: string;
  reason_display: string;
  assigned_admin?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  messages_count: number;
  unread_count: number;
}

interface ArbitrationStats {
  total_cases: number;
  new_cases: number;
  in_progress: number;
  awaiting_decision: number;
  closed_cases: number;
  urgent_cases: number;
}

export const useArbitration = (autoFetch = true) => {
  const [cases, setCases] = useState<ArbitrationCase[]>([]);
  const [stats, setStats] = useState<ArbitrationStats>({
    total_cases: 0,
    new_cases: 0,
    in_progress: 0,
    awaiting_decision: 0,
    closed_cases: 0,
    urgent_cases: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/arbitration/cases/');
      setCases(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching arbitration cases:', error);
      message.error('Ошибка при загрузке дел');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/arbitration/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching arbitration stats:', error);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchCases();
      fetchStats();
    }
  }, [autoFetch]);

  const refetch = () => {
    fetchCases();
    fetchStats();
  };

  return {
    cases,
    stats,
    loading,
    refetch
  };
};
