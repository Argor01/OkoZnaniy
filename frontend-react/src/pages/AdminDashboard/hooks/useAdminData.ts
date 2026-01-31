import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { adminApi } from '../../../api/admin';
import { disputesApi } from '../../../api/disputes';
import { QUERY_KEYS, QUERY_CONFIG } from '../constants';
import type { Partner, PartnerEarning, Dispute, Arbitrator, AdminStats } from '../types';

/**
 * Хук для получения всех данных админской панели
 * Вынесен из монолитного AdminDashboard.tsx
 */
export const useAdminData = (canLoadData: boolean) => {
  // Партнеры
  const partnersQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_PARTNERS,
    queryFn: adminApi.getPartners,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    cacheTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: any): Partner[] => {
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching partners:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных партнеров');
      }
    },
  });

  // Начисления
  const earningsQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_EARNINGS,
    queryFn: adminApi.getEarnings,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    cacheTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: any): PartnerEarning[] => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching earnings:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных начислений');
      }
    },
  });

  // Споры
  const disputesQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_DISPUTES,
    queryFn: disputesApi.getDisputes,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    cacheTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: any): Dispute[] => {
      // API возвращает пагинированный ответ: {count: 2, next: null, previous: null, results: Array}
      if (data?.data?.results && Array.isArray(data.data.results)) {
        return data.data.results;
      }
      
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching disputes:', error);
      // Не показываем ошибку, если это 404 (споры могут отсутствовать)
      if (error.response?.status !== 401 && error.response?.status !== 404) {
        message.warning('Не удалось загрузить данные о спорах');
      }
    },
  });

  // Арбитры
  const arbitratorsQuery = useQuery<Arbitrator[]>({
    queryKey: QUERY_KEYS.ADMIN_ARBITRATORS,
    queryFn: adminApi.getArbitrators,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    cacheTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: any): Arbitrator[] => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
    onError: (error: any) => {
      console.error('Error fetching arbitrators:', error);
      if (error.response?.status !== 401) {
        message.error('Ошибка при загрузке данных арбитров');
      }
    },
  });

  // Вычисляем статистику на основе полученных данных
  const calculateStats = (): AdminStats => {
    const partners = partnersQuery.data || [];
    const earnings = earningsQuery.data || [];
    const disputes = disputesQuery.data || [];

    const totalPartners = partners.length;
    const totalReferrals = partners.reduce((sum, p) => sum + (p.total_referrals || 0), 0);
    const totalEarnings = partners.reduce((sum, p) => sum + (p.total_earnings || 0), 0);
    const unpaidEarnings = earnings.filter(e => !e.is_paid).length;
    const totalDisputes = disputes.length;
    const resolvedDisputes = disputes.filter(d => d.resolved).length;
    const pendingDisputes = totalDisputes - resolvedDisputes;

    return {
      totalPartners,
      totalReferrals,
      totalEarnings,
      unpaidEarnings,
      totalDisputes,
      resolvedDisputes,
      pendingDisputes,
    };
  };

  // Проверяем состояние загрузки
  const isLoading = partnersQuery.isLoading || earningsQuery.isLoading || 
                   disputesQuery.isLoading || arbitratorsQuery.isLoading;

  const hasErrors = partnersQuery.error || earningsQuery.error || 
                   disputesQuery.error || arbitratorsQuery.error;

  return {
    // Данные
    partners: partnersQuery.data || [],
    earnings: earningsQuery.data || [],
    disputes: disputesQuery.data || [],
    arbitrators: arbitratorsQuery.data || [],
    stats: calculateStats(),

    // Состояние загрузки
    partnersLoading: partnersQuery.isLoading,
    earningsLoading: earningsQuery.isLoading,
    disputesLoading: disputesQuery.isLoading,
    arbitratorsLoading: arbitratorsQuery.isLoading,
    isLoading,

    // Ошибки
    partnersError: partnersQuery.error,
    earningsError: earningsQuery.error,
    disputesError: disputesQuery.error,
    arbitratorsError: arbitratorsQuery.error,
    hasErrors,

    // Методы для обновления
    refetchPartners: partnersQuery.refetch,
    refetchEarnings: earningsQuery.refetch,
    refetchDisputes: disputesQuery.refetch,
    refetchArbitrators: arbitratorsQuery.refetch,
    refetchAll: () => {
      partnersQuery.refetch();
      earningsQuery.refetch();
      disputesQuery.refetch();
      arbitratorsQuery.refetch();
    },
  };
};