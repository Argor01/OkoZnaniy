
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPanelApi } from '@/features/admin/api';
import { QUERY_KEYS } from '@/features/admin/constants/adminConstants';
import { message } from 'antd';

export const useClaims = (status?: string, enabled: boolean = true) => {
  const { data: claims = [], isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEYS.ADMIN_CLAIMS(status),
    queryFn: () => adminPanelApi.getClaims(status),
    enabled,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
      if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  return { claims, loading, refetch };
};

export const useClaimActions = () => {
  const queryClient = useQueryClient();

  const invalidateClaims = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_CLAIMS()[0]] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_TICKETS });
  };

  const { mutateAsync: takeInWork } = useMutation({
    mutationFn: (claimId: number) => adminPanelApi.takeClaimInWork(claimId),
    onSuccess: () => {
      message.success('Претензия взята в работу');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при взятии претензии в работу'),
  });

  const { mutateAsync: completeClaim } = useMutation({
    mutationFn: ({ claimId, resolution }: { claimId: number; resolution: string }) => 
      adminPanelApi.completeClaim(claimId, resolution),
    onSuccess: () => {
      message.success('Претензия завершена');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при завершении претензии'),
  });

  const { mutateAsync: rejectClaim } = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: number; reason: string }) => 
      adminPanelApi.rejectClaim(claimId, reason),
    onSuccess: () => {
      message.success('Претензия отклонена');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при отклонении претензии'),
  });

  const { mutateAsync: updateProgress } = useMutation({
    mutationFn: ({ claimId, progress }: { claimId: number; progress: number }) => 
      adminPanelApi.updateClaimProgress(claimId, progress),
    onSuccess: () => {
      message.success('Прогресс обновлен');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при обновлении прогресса'),
  });

  const { mutateAsync: reopenClaim } = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: number; reason: string }) => 
      adminPanelApi.reopenClaim(claimId, reason),
    onSuccess: () => {
      message.success('Претензия переоткрыта');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при переоткрытии претензии'),
  });

  const { mutateAsync: approveClaim } = useMutation({
    mutationFn: ({ claimId, decision }: { claimId: number; decision: string }) => 
      adminPanelApi.approveClaim(claimId, decision),
    onSuccess: () => {
      message.success('Претензия одобрена');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при одобрении претензии'),
  });

  const { mutateAsync: rejectApproval } = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: number; reason: string }) => 
      adminPanelApi.rejectClaimApproval(claimId, reason),
    onSuccess: () => {
      message.success('Одобрение отклонено');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при отклонении одобрения'),
  });

  const { mutateAsync: escalateToDirector } = useMutation({
    mutationFn: (claimId: number) => adminPanelApi.escalateClaim(claimId),
    onSuccess: () => {
      message.success('Претензия эскалирована директору');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при эскалации претензии'),
  });

  const { mutateAsync: requestMoreInfo } = useMutation({
    mutationFn: ({ claimId, questions }: { claimId: number; questions: string }) => 
      adminPanelApi.requestClaimInfo(claimId, questions),
    onSuccess: () => {
      message.success('Запрос информации отправлен');
      invalidateClaims();
    },
    onError: () => message.error('Ошибка при запросе информации'),
  });

  return { 
    takeInWork, 
    completeClaim: (claimId: number, resolution: string) => completeClaim({ claimId, resolution }),
    rejectClaim: (claimId: number, reason: string) => rejectClaim({ claimId, reason }),
    updateProgress: (claimId: number, progress: number) => updateProgress({ claimId, progress }),
    reopenClaim: (claimId: number, reason: string) => reopenClaim({ claimId, reason }),
    approveClaim: (claimId: number, decision: string) => approveClaim({ claimId, decision }),
    rejectApproval: (claimId: number, reason: string) => rejectApproval({ claimId, reason }),
    escalateToDirector, 
    requestMoreInfo: (claimId: number, questions: string) => requestMoreInfo({ claimId, questions })
  };
};
