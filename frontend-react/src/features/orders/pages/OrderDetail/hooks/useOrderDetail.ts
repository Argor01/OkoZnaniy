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
  const [reviewActionLoading, setReviewActionLoading] = useState<'approve' | 'revision' | 'reject' | null>(null);
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
      message.warning('Р—Р°РєР°Р· Р±С‹Р» СѓРґР°Р»С‘РЅ Рё Р±РѕР»СЊС€Рµ РЅРµРґРѕСЃС‚СѓРїРµРЅ');
      navigate(ROUTES.orders.feed);
    }
  }, [orderError, orderId, navigate, removeOrderFromCaches]);

  const { data: bids = [], isLoading: bidsLoading } = useQuery({
    queryKey: ['order-bids', orderId],
    queryFn: () => ordersApi.getBids(Number(orderId)),
    enabled: !!orderId,
  });

  const userHasBid = useMemo(() => {
    return Array.isArray(bids) && bids.some((bid: Bid) => bid.expert.id === userProfile?.id);
  }, [bids, userProfile]);

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

      if (order?.status === 'review') {
        await ordersApi.approveOrder(Number(orderId));
      } else if (order?.status !== 'completed') {
        message.error('Оставить отзыв можно только после проверки или завершения заказа');
        return;
      }

      await ordersApi.createReview(Number(orderId), reviewRating, reviewComment.trim());
      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(order?.status === 'review' ? 'Работа принята, отзыв оставлен' : 'Отзыв сохранён');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || 'Не удалось сохранить отзыв');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [order?.status, orderId, refreshOrderWithLists, reviewRating, reviewComment]);

  const handleApproveWithoutReview = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewSubmitting(true);
      setReviewActionLoading('approve');

      if (order?.status === 'review') {
        await ordersApi.approveOrder(Number(orderId));
      } else if (order?.status !== 'completed') {
        message.error('Принять работу можно только из статуса проверки');
        return;
      }

      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(
        order?.status === 'review'
          ? 'Работа принята. Вы сможете оставить отзыв позже.'
          : 'Заказ уже завершён. Отзыв можно оставить позже.'
      );
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || 'Не удалось принять работу');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [order?.status, orderId, refreshOrderWithLists]);

  const handleConfirmRevisionFromCard = useCallback(async () => {
    if (!orderId) return;
    const comment = revisionComment.trim();
    if (!comment) {
      message.warning('Р”РѕР±Р°РІСЊС‚Рµ РєРѕРјРјРµРЅС‚Р°СЂРёР№ РґР»СЏ РґРѕСЂР°Р±РѕС‚РєРё');
      return;
    }
    try {
      setRevisionSubmitting(true);
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId), comment);
      await refreshOrderWithLists();
      setRevisionModalOpen(false);
      setRevisionComment('');
      message.success('Р Р°Р±РѕС‚Р° РѕС‚РїСЂР°РІР»РµРЅР° РЅР° РґРѕСЂР°Р±РѕС‚РєСѓ');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РЅР° РґРѕСЂР°Р±РѕС‚РєСѓ');
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
      message.success('Р Р°Р±РѕС‚Р° РѕС‚РєР»РѕРЅРµРЅР°');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєР»РѕРЅРёС‚СЊ СЂР°Р±РѕС‚Сѓ');
    } finally {
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleAssignExpert = useCallback(async (bidId: number, expertId: number, expertUsername: string) => {
    if (!orderId) return;
    try {
      setAssigningExpertId(expertId);
      const response = await ordersApi.acceptBid(Number(orderId), bidId);
      await refreshOrderWithLists();
      message.success(`Р­РєСЃРїРµСЂС‚ ${expertUsername} РЅР°Р·РЅР°С‡РµРЅ РёСЃРїРѕР»РЅРёС‚РµР»РµРј`);
      const chatId = response?.chat_id;
      if (chatId) {
        setTimeout(() => { dashboard.openOrderChat(Number(orderId), expertId, chatId); }, 300);
      } else {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openChatById', { detail: { userId: expertId } }));
        }, 500);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р·РЅР°С‡РёС‚СЊ РёСЃРїРѕР»РЅРёС‚РµР»СЏ');
    } finally {
      setAssigningExpertId(null);
    }
  }, [orderId, refreshOrderWithLists, dashboard]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!orderId || files.length === 0) return;
    try {
      setUploadingFiles(true);
      const uploadPromises = files.map(file =>
        ordersApi.uploadOrderFile(Number(orderId), file, {
          file_type: 'solution',
          description: 'Р“РѕС‚РѕРІР°СЏ СЂР°Р±РѕС‚Р° Р·Р°РіСЂСѓР¶РµРЅР° СЌРєСЃРїРµСЂС‚РѕРј'
        })
      );
      await Promise.all(uploadPromises);
      await ordersApi.submitOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success(files.length > 1 ? 'Р Р°Р±РѕС‚С‹ РѕС‚РїСЂР°РІР»РµРЅС‹ РЅР° РїСЂРѕРІРµСЂРєСѓ' : 'Р Р°Р±РѕС‚Р° РѕС‚РїСЂР°РІР»РµРЅР° РЅР° РїСЂРѕРІРµСЂРєСѓ');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ С„Р°Р№Р»РѕРІ');
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
        message.error('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєР°С‡Р°С‚СЊ С„Р°Р№Р»');
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
        message.error('РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅРѕ РґР»СЏ СЃРєР°С‡РёРІР°РЅРёСЏ С„Р°Р№Р»Р°');
      } else {
        message.error('РћС€РёР±РєР° РїСЂРё СЃРєР°С‡РёРІР°РЅРёРё С„Р°Р№Р»Р°');
      }
    }
  }, [orderId]);

  const handleDeleteOrderFile = useCallback((file: any) => {
    if (!orderId || !file?.id) return;
    const filename = file?.filename || file?.file_name || 'С„Р°Р№Р»';
    Modal.confirm({
      title: 'РЈРґР°Р»РёС‚СЊ С„Р°Р№Р»?',
      content: `Р¤Р°Р№Р» "${filename}" Р±СѓРґРµС‚ СѓРґР°Р»С‘РЅ РёР· Р·Р°РєР°Р·Р°.`,
      okText: 'РЈРґР°Р»РёС‚СЊ',
      cancelText: 'РћС‚РјРµРЅР°',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ordersApi.deleteOrderFile(Number(orderId), Number(file.id));
          await refreshOrderWithLists();
          message.success('Р¤Р°Р№Р» СѓРґР°Р»С‘РЅ');
        } catch (e: any) {
          message.error(e?.response?.data?.detail || 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ С„Р°Р№Р»');
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

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files));
    }
  }, [handleFileUpload]);

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
    userHasBid,

    // Handlers
    refreshOrderWithLists,
    handleConfirmReviewAndApprove,
    handleApproveWithoutReview,
    handleConfirmRevisionFromCard,
    handleRejectFromCard,
    handleAssignExpert,
    handleFileUpload,
    handleDownloadFile,
    handleDeleteOrderFile,
    handleDrag,
    handleDrop,
    handleFileInput,
    removeOrderFromCaches,
    navigate,
    location,
    queryClient,
    dashboard,
  };
}
