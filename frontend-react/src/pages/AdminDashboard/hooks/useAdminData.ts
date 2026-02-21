import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { adminApi } from '../../../api/admin';
import { disputesApi } from '../../../api/disputes';
import { QUERY_KEYS, QUERY_CONFIG } from '../constants';
import type { Partner, PartnerEarning, Dispute, Arbitrator, AdminStats } from '../types';


export const useAdminData = (canLoadData: boolean): {
  partners: Partner[];
  earnings: PartnerEarning[];
  disputes: Dispute[];
  arbitrators: Arbitrator[];
  stats: AdminStats;
  partnersLoading: boolean;
  earningsLoading: boolean;
  disputesLoading: boolean;
  arbitratorsLoading: boolean;
  isLoading: boolean;
  partnersError: unknown;
  earningsError: unknown;
  disputesError: unknown;
  arbitratorsError: unknown;
  hasErrors: unknown;
  refetchPartners: () => void;
  refetchEarnings: () => void;
  refetchDisputes: () => void;
  refetchArbitrators: () => void;
  refetchAll: () => void;
} => {
  const lastErrorRef = useRef<{
    partners?: unknown;
    earnings?: unknown;
    disputes?: unknown;
    arbitrators?: unknown;
  }>({});

  
  const partnersQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_PARTNERS,
    queryFn: adminApi.getPartners,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: unknown): Partner[] => {
      
      if (Array.isArray(data)) return data;
      if (
        typeof data === 'object' &&
        data !== null &&
        'results' in data &&
        Array.isArray((data as { results?: unknown }).results)
      ) {
        return (data as { results: Partner[] }).results;
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as { data?: unknown }).data)
      ) {
        return (data as { data: Partner[] }).data;
      }
      return [];
    },
  });

  
  const earningsQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_EARNINGS,
    queryFn: adminApi.getEarnings,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: unknown): PartnerEarning[] => {
      if (Array.isArray(data)) return data;
      if (
        typeof data === 'object' &&
        data !== null &&
        'results' in data &&
        Array.isArray((data as { results?: unknown }).results)
      ) {
        return (data as { results: PartnerEarning[] }).results;
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as { data?: unknown }).data)
      ) {
        return (data as { data: PartnerEarning[] }).data;
      }
      return [];
    },
  });

  
  const disputesQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_DISPUTES,
    queryFn: disputesApi.getDisputes,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: unknown): Dispute[] => {
      
      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        typeof (data as { data?: unknown }).data === 'object' &&
        (data as { data?: unknown }).data !== null &&
        'results' in ((data as { data?: unknown }).data as object) &&
        Array.isArray((((data as { data?: unknown }).data as { results?: unknown }).results))
      ) {
        return ((data as { data: { results: Dispute[] } }).data.results);
      }
      
      
      if (Array.isArray(data)) return data;
      if (
        typeof data === 'object' &&
        data !== null &&
        'results' in data &&
        Array.isArray((data as { results?: unknown }).results)
      ) {
        return (data as { results: Dispute[] }).results;
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as { data?: unknown }).data)
      ) {
        return (data as { data: Dispute[] }).data;
      }
      return [];
    },
  });

  
  const arbitratorsQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_ARBITRATORS,
    queryFn: adminApi.getArbitrators,
    enabled: canLoadData,
    retry: QUERY_CONFIG.RETRY,
    retryDelay: QUERY_CONFIG.RETRY_DELAY,
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.CACHE_TIME,
    select: (data: unknown): Arbitrator[] => {
      if (Array.isArray(data)) return data;
      if (
        typeof data === 'object' &&
        data !== null &&
        'results' in data &&
        Array.isArray((data as { results?: unknown }).results)
      ) {
        return (data as { results: Arbitrator[] }).results;
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as { data?: unknown }).data)
      ) {
        return (data as { data: Arbitrator[] }).data;
      }
      return [];
    },
  });

  useEffect(() => {
    if (!partnersQuery.error) return;
    if (lastErrorRef.current.partners === partnersQuery.error) return;
    lastErrorRef.current.partners = partnersQuery.error;

    const status = (partnersQuery.error as { response?: { status?: number } })?.response?.status;
    if (status !== 401) message.error('Ошибка при загрузке данных партнеров');
  }, [partnersQuery.error]);

  useEffect(() => {
    if (!earningsQuery.error) return;
    if (lastErrorRef.current.earnings === earningsQuery.error) return;
    lastErrorRef.current.earnings = earningsQuery.error;

    const status = (earningsQuery.error as { response?: { status?: number } })?.response?.status;
    if (status !== 401) message.error('Ошибка при загрузке данных начислений');
  }, [earningsQuery.error]);

  useEffect(() => {
    if (!disputesQuery.error) return;
    if (lastErrorRef.current.disputes === disputesQuery.error) return;
    lastErrorRef.current.disputes = disputesQuery.error;

    const status = (disputesQuery.error as { response?: { status?: number } })?.response?.status;
    if (status !== 401 && status !== 404) message.warning('Не удалось загрузить данные о спорах');
  }, [disputesQuery.error]);

  useEffect(() => {
    if (!arbitratorsQuery.error) return;
    if (lastErrorRef.current.arbitrators === arbitratorsQuery.error) return;
    lastErrorRef.current.arbitrators = arbitratorsQuery.error;

    const status = (arbitratorsQuery.error as { response?: { status?: number } })?.response?.status;
    if (status !== 401) message.error('Ошибка при загрузке данных арбитров');
  }, [arbitratorsQuery.error]);

  
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

  
  const isLoading = partnersQuery.isLoading || earningsQuery.isLoading || 
                   disputesQuery.isLoading || arbitratorsQuery.isLoading;

  const hasErrors = partnersQuery.error || earningsQuery.error || 
                   disputesQuery.error || arbitratorsQuery.error;

  return {
    
    partners: partnersQuery.data || [] as Partner[],
    earnings: earningsQuery.data || [] as PartnerEarning[],
    disputes: disputesQuery.data || [] as Dispute[],
    arbitrators: arbitratorsQuery.data || [] as Arbitrator[],
    stats: calculateStats(),

    
    partnersLoading: partnersQuery.isLoading,
    earningsLoading: earningsQuery.isLoading,
    disputesLoading: disputesQuery.isLoading,
    arbitratorsLoading: arbitratorsQuery.isLoading,
    isLoading,

    
    partnersError: partnersQuery.error,
    earningsError: earningsQuery.error,
    disputesError: disputesQuery.error,
    arbitratorsError: arbitratorsQuery.error,
    hasErrors,

    
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
