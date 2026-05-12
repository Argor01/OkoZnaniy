import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import { ordersApi, type Bid, type Order } from '@/features/orders/api/orders';
import { authApi } from '@/features/auth/api/auth';
import { useDashboard } from '@/contexts/DashboardContext';
import { ROUTES } from '@/utils/constants';
import { logger } from '@/utils/logger';

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
    queryKey: ['user-profile'],
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
      message.warning('Заказ был удалён и больше недоступен');
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
      await ordersApi.approveOrder(Number(orderId));
      await ordersApi.createReview(Number(orderId), reviewRating, reviewComment.trim());
      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success('Работа принята, отзыв оставлен');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось принять работу');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, reviewRating, reviewComment]);

  const handleApproveWithoutReview = useCallback(async () => {
    if (!orderId) return;
    try {
      setReviewSubmitting(true);
      setReviewActionLoading('approve');
      await ordersApi.approveOrder(Number(orderId));
      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success('Работа принята. Вы сможете оставить отзыв позже в разделе «Отзывы».');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось принять работу');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleConfirmRevisionFromCard = useCallback(async () => {
    if (!orderId) return;
    const comment = revisionComment.trim();
    if (!comment) {
      message.warning('Добавьте комментарий для доработки');
      return;
    }
    try {
      setRevisionSubmitting(true);
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId), comment);
      await refreshOrderWithLists();
      setRevisionModalOpen(false);
      setRevisionComment('');
      message.success('Работа отправлена на доработку');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отправить на доработку');
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
      message.success('Работа отклонена');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось отклонить работу');
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
      message.success(`Эксперт ${expertUsername} назначен исполнителем`);
      const chatId = response?.chat_id;
      if (chatId) {
        setTimeout(() => { dashboard.openOrderChat(Number(orderId), expertId, chatId); }, 300);
      } else {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openChatById', { detail: { userId: expertId } }));
        }, 500);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.detail || 'Не удалось назначить исполнителя');
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
          description: 'Готовая работа загружена экспертом'
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
        message.error('Не авторизовано для скачивания файла');
      } else {
        message.error('Ошибка при скачивании файла');
      }
    }
  }, [orderId]);

  const handleDeleteOrderFile = useCallback((file: any) => {
    if (!orderId || !file?.id) return;
    const filename = file?.filename || file?.file_name || 'файл';
    Modal.confirm({
      title: 'Удалить файл?',
      content: `Файл "${filename}" будет удалён из заказа.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ordersApi.deleteOrderFile(Number(orderId), Number(file.id));
          await refreshOrderWithLists();
          message.success('Файл удалён');
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
