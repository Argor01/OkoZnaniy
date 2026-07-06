import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import { ordersApi, type Bid, type Order } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import { useDashboard } from '@/contexts/DashboardContext';
import { ROUTES } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { CURRENT_USER_KEY } from '@/hooks/queries';

export function useOrderDetail(orderId?: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const dashboard = useDashboard();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [reviewActionLoading, setReviewActionLoading] = useState<'approve' | 'revision' | 'reject' | 'accept_assignment' | 'decline_assignment' | null>(null);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [assigningExpertId, setAssigningExpertId] = useState<number | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [openingBidModal, setOpeningBidModal] = useState(false);
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);

  const removeOrderFromCaches = useCallback((id: number) => {
    const filterOut = (data: any) => {
      if (!data) return data;
      if (Array.isArray(data)) return data.filter((o: any) => o?.id !== id);
      if (Array.isArray(data.results)) return { ...data, results: data.results.filter((o: any) => o?.id !== id) };
      return data;
    };
    queryClient.setQueryData(['orders-feed'], filterOut);
    queryClient.setQueryData(['available-orders'], filterOut);
    queryClient.setQueryData(['user-orders'], filterOut);
  }, [queryClient]);

  const { data: userProfile } = useQuery({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
  });

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: order, isLoading, error: orderError, refetch: refetchOrder } = useQuery<Order, Error>({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(Number(orderId)),
    enabled: !!orderId,
    retry: (failureCount: number, error: any) => {
      const status = error?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  React.useEffect(() => {
    const status = (orderError as any)?.response?.status;
    if (status === 404 && orderId) {
      const idNum = Number(orderId);
      if (!Number.isNaN(idNum)) removeOrderFromCaches(idNum);
      message.warning('Р вЂ”Р В°Р С”Р В°Р В· Р В±РЎвЂ№Р В» РЎС“Р Т‘Р В°Р В»РЎвЂР Р… Р С‘ Р В±Р С•Р В»РЎРЉРЎв‚¬Р Вµ Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р ВµР Р…');
      navigate(ROUTES.orders.feed);
    }
  }, [orderError, orderId, navigate, removeOrderFromCaches]);

  const { data: bids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['order-bids', orderId],
    queryFn: () => ordersApi.getBids(Number(orderId)),
    enabled: !!orderId,
  });

  const currentUserBid = useMemo(() => {
    if (!Array.isArray(bids)) return null;
    return bids.find((bid: Bid) => bid.expert.id === userProfile?.id) ?? null;
  }, [bids, userProfile]);

  const userHasBid = useMemo(() => Boolean(currentUserBid), [currentUserBid]);

  const refreshOrderWithLists = useCallback(async () => {
    await refetchOrder();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['available-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['user-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
    ]);
  }, [orderId, queryClient, refetchOrder]);

  const handleConfirmReviewAndApprove = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewSubmitting(true);
      setReviewActionLoading('approve');

      const numericOrderId = Number(orderId);
      const freshOrder = await ordersApi.getById(numericOrderId);
      const freshOrderClientId = Number(freshOrder?.client?.id ?? (freshOrder as any)?.client_id ?? 0);
      const currentUserId = Number(userProfile?.id ?? 0);

      if (currentUserId <= 0 || freshOrderClientId !== currentUserId) {
        message.error('РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ Р·Р°РєР°Р·С‡РёРє СЌС‚РѕРіРѕ Р·Р°РєР°Р·Р°');
        return;
      }

      let latestStatus = String(freshOrder?.status ?? '');
      if (latestStatus === 'review') {
        try {
          await ordersApi.approveOrder(numericOrderId);
          latestStatus = 'completed';
        } catch (e: any) {
          const refreshedOrder = await ordersApi.getById(numericOrderId);
          const refreshedStatus = String(refreshedOrder?.status ?? '');
          if (refreshedStatus !== 'completed') {
            throw e;
          }
          latestStatus = refreshedStatus;
        }
      }

      if (latestStatus !== 'completed') {
        message.error('РћСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ РїСЂРѕРІРµСЂРєРё РёР»Рё Р·Р°РІРµСЂС€РµРЅРёСЏ Р·Р°РєР°Р·Р°');
        return;
      }

      await ordersApi.createReview(numericOrderId, reviewRating, reviewComment.trim());
      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(
        String(freshOrder?.status ?? '') === 'review'
          ? 'Р Р°Р±РѕС‚Р° РїСЂРёРЅСЏС‚Р°, РѕС‚Р·С‹РІ РѕСЃС‚Р°РІР»РµРЅ'
          : 'РћС‚Р·С‹РІ СЃРѕС…СЂР°РЅС‘РЅ'
      );
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РѕС‚Р·С‹РІ');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, reviewRating, reviewComment, userProfile?.id]);

  const handleApproveWithoutReview = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewSubmitting(true);
      setReviewActionLoading('approve');

      const numericOrderId = Number(orderId);
      const freshOrder = await ordersApi.getById(numericOrderId);
      const freshOrderClientId = Number(freshOrder?.client?.id ?? (freshOrder as any)?.client_id ?? 0);
      const currentUserId = Number(userProfile?.id ?? 0);

      if (currentUserId <= 0 || freshOrderClientId !== currentUserId) {
        message.error('РџСЂРёРЅСЏС‚СЊ СЂР°Р±РѕС‚Сѓ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ Р·Р°РєР°Р·С‡РёРє СЌС‚РѕРіРѕ Р·Р°РєР°Р·Р°');
        return;
      }

      let latestStatus = String(freshOrder?.status ?? '');
      if (latestStatus === 'review') {
        try {
          await ordersApi.approveOrder(numericOrderId);
          latestStatus = 'completed';
        } catch (e: any) {
          const refreshedOrder = await ordersApi.getById(numericOrderId);
          const refreshedStatus = String(refreshedOrder?.status ?? '');
          if (refreshedStatus !== 'completed') {
            throw e;
          }
          latestStatus = refreshedStatus;
        }
      }

      if (latestStatus !== 'completed') {
        message.error('РџСЂРёРЅСЏС‚СЊ СЂР°Р±РѕС‚Сѓ РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ РёР· СЃС‚Р°С‚СѓСЃР° РїСЂРѕРІРµСЂРєРё');
        return;
      }

      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(
        String(freshOrder?.status ?? '') === 'review'
          ? 'Р Р°Р±РѕС‚Р° РїСЂРёРЅСЏС‚Р°. Р’С‹ СЃРјРѕР¶РµС‚Рµ РѕСЃС‚Р°РІРёС‚СЊ РѕС‚Р·С‹РІ РїРѕР·Р¶Рµ.'
          : 'Р—Р°РєР°Р· СѓР¶Рµ Р·Р°РІРµСЂС€С‘РЅ. РћС‚Р·С‹РІ РјРѕР¶РЅРѕ РѕСЃС‚Р°РІРёС‚СЊ РїРѕР·Р¶Рµ.'
      );
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРЅСЏС‚СЊ СЂР°Р±РѕС‚Сѓ');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, userProfile?.id]);

  const handleConfirmRevisionFromCard = useCallback(async () => {
    if (!orderId) return;
    const comment = revisionComment.trim();
    if (!comment) {
      message.warning('Р вЂќР С•Р В±Р В°Р Р†РЎРЉРЎвЂљР Вµ Р С”Р С•Р СР СР ВµР Р…РЎвЂљР В°РЎР‚Р С‘Р в„– Р Т‘Р В»РЎРЏ Р Т‘Р С•РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р С‘');
      return;
    }
    try {
      setRevisionSubmitting(true);
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId), comment);
      await refreshOrderWithLists();
      setRevisionModalOpen(false);
      setRevisionComment('');
      message.success('Р В Р В°Р В±Р С•РЎвЂљР В° Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р В° Р Р…Р В° Р Т‘Р С•РЎР‚Р В°Р В±Р С•РЎвЂљР С”РЎС“');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р…Р В° Р Т‘Р С•РЎР‚Р В°Р В±Р С•РЎвЂљР С”РЎС“');
    } finally {
      setRevisionSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, revisionComment]);

  const handleRejectFromCard = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewActionLoading('reject');
      await ordersApi.rejectOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success('Р В Р В°Р В±Р С•РЎвЂљР В° Р С•РЎвЂљР С”Р В»Р С•Р Р…Р ВµР Р…Р В°');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎвЂљР С”Р В»Р С•Р Р…Р С‘РЎвЂљРЎРЉ РЎР‚Р В°Р В±Р С•РЎвЂљРЎС“');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleAssignExpert = useCallback(async (bidId: number, expertId: number, expertUsername: string) => {
    if (!orderId) return;
    try {
      setAssigningExpertId(expertId);
      await ordersApi.acceptBid(Number(orderId), bidId);
      await refreshOrderWithLists();
      message.success(`Исполнителю ${expertUsername} отправлено приглашение принять заказ`);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отправить приглашение исполнителю');
    } finally {
      setAssigningExpertId(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleAcceptAssignment = useCallback(async () => {
    if (!orderId || !order) return;
    try {
      setReviewActionLoading('accept_assignment');
      const response = await ordersApi.acceptAssignment(Number(orderId));
      await refreshOrderWithLists();
      message.success('Заказ принят в работу');
      if (response?.chat_id && order.expert?.id) {
        setTimeout(() => {
          dashboard.openOrderChat(Number(orderId), order.expert!.id, response.chat_id);
        }, 300);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось принять заказ');
    } finally {
      setReviewActionLoading(null);
    }
  }, [dashboard, order, orderId, refreshOrderWithLists]);

  const handleDeclineAssignment = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewActionLoading('decline_assignment');
      await ordersApi.declineAssignment(Number(orderId));
      await refreshOrderWithLists();
      message.success('Приглашение на заказ отклонено');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отклонить заказ');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!orderId || files.length === 0) return;
    try {
      setUploadingFiles(true);
      const uploadPromises = files.map((file) =>
        ordersApi.uploadOrderFile(Number(orderId), file, {
          file_type: 'solution',
          description: 'Готовая работа загружена экспертом',
        })
      );
      await Promise.all(uploadPromises);
      await ordersApi.submitOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success(files.length > 1 ? 'Работы отправлены на проверку' : 'Работа отправлена на проверку');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Ошибка при загрузке файлов');
    } finally {
      setUploadingFiles(false);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleTaskFileUpload = useCallback(async (files: File[]) => {
    if (!orderId || files.length === 0) return;
    try {
      setUploadingFiles(true);
      await Promise.all(
        files.map((file) =>
          ordersApi.uploadOrderFile(Number(orderId), file, {
            file_type: 'task',
            description: 'Файл задания',
          })
        )
      );
      await refreshOrderWithLists();
      message.success(files.length > 1 ? 'Файлы задания загружены' : 'Файл задания загружен');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось загрузить файл задания');
    } finally {
      setUploadingFiles(false);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleDownloadFile = useCallback(async (file: any) => {
    try {
      const orderIdNum = Number(orderId);
      const fileIdNum = Number(file?.id);
      const filename = file?.filename || file?.file_name || 'file';
      if (!orderIdNum || Number.isNaN(orderIdNum) || !fileIdNum || Number.isNaN(fileIdNum)) {
        message.error('Не удалось скачать файл');
        return;
      }
      const blob = await ordersApi.downloadOrderFile(orderIdNum, fileIdNum);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        message.error('Недостаточно прав для скачивания файла');
      } else {
        message.error('Ошибка при скачивании файла');
      }
    }
  }, [orderId]);

  const handleDeleteOrderFile = useCallback((file: any) => {
    if (!orderId || !file?.id) return;
    const filename = file?.filename || file?.file_name || 'Файл';
    Modal.confirm({
      title: 'Удалить файл?',
      content: `Файл "${filename}" будет удален из заказа.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ordersApi.deleteOrderFile(Number(orderId), Number(file.id));
          await refreshOrderWithLists();
          message.success('Файл удален');
        } catch (e: any) {
          message.error(e?.response?.data?.detail || 'Не удалось удалить файл');
        }
      },
    });
  }, [orderId, refreshOrderWithLists]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  }, [handleFileUpload]);

  const handleTaskFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleTaskFileUpload(Array.from(e.dataTransfer.files));
    }
  }, [handleTaskFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files));
    }
  }, [handleFileUpload]);

  const handleTaskFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleTaskFileUpload(Array.from(e.target.files));
    }
  }, [handleTaskFileUpload]);

  return {
    // State
    isMobile,
    bidModalVisible, setBidModalVisible,
    reviewActionLoading,
    revisionModalOpen, setRevisionModalOpen,
    revisionComment, setRevisionComment,
    revisionSubmitting,
    reviewModalOpen, setReviewModalOpen,
    reviewRating, setReviewRating,
    reviewComment, setReviewComment,
    reviewSubmitting,
    assigningExpertId,
    uploadingFiles,
    dragActive,
    openingBidModal, setOpeningBidModal,
    editOrderModalVisible, setEditOrderModalVisible,

    // Data
    userProfile,
    order, isLoading, orderError,
    bids, bidsLoading,
    currentUserBid,
    userHasBid,

    // Handlers
    refreshOrderWithLists,
    handleConfirmReviewAndApprove,
    handleApproveWithoutReview,
    handleConfirmRevisionFromCard,
    handleRejectFromCard,
    handleAssignExpert,
    handleAcceptAssignment,
    handleDeclineAssignment,
    handleFileUpload,
    handleDownloadFile,
    handleDeleteOrderFile,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleTaskFileDrop,
    handleTaskFileInput,
    removeOrderFromCaches,
    navigate,
    location,
    queryClient,
    dashboard,
  };
}


