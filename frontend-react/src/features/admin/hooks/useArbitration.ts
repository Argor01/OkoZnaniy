import { useState, useEffect } from 'react';
import { message } from 'antd';
import { arbitrationApi, ArbitrationCase, ArbitrationStats } from '@/features/admin/api/arbitration';

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
      const data = await arbitrationApi.getCases();
      setCases(data);
    } catch (error) {
      console.error('Error fetching arbitration cases:', error);
      message.error('Ошибка при загрузке дел');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await arbitrationApi.getStats();
      setStats(data);
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
