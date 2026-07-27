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
      message.warning('\u0417\u0430\u043a\u0430\u0437 \u0431\u044b\u043b \u0443\u0434\u0430\u043b\u0451\u043d \u0438\u043b\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d');
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
        message.error('\u041e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432 \u043c\u043e\u0436\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u043a\u0430\u0437\u0447\u0438\u043a \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430');
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
        message.error('\u041e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432 \u043c\u043e\u0436\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438\u043b\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u0437\u0430\u043a\u0430\u0437\u0430');
        return;
      }

      await ordersApi.createReview(numericOrderId, reviewRating, reviewComment.trim());
      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(
        String(freshOrder?.status ?? '') === 'review'
          ? '\u0420\u0430\u0431\u043e\u0442\u0430 \u043f\u0440\u0438\u043d\u044f\u0442\u0430, \u043e\u0442\u0437\u044b\u0432 \u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d'
          : '\u041e\u0442\u0437\u044b\u0432 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d'
      );
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432');
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
        message.error('\u041f\u0440\u0438\u043d\u044f\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443 \u043c\u043e\u0436\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u043a\u0430\u0437\u0447\u0438\u043a \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430');
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
        message.error('\u041f\u0440\u0438\u043d\u044f\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443 \u043c\u043e\u0436\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u0438\u0437 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438');
        return;
      }

      await refreshOrderWithLists();
      setReviewModalOpen(false);
      setReviewRating(5);
      setReviewComment('');
      message.success(
        String(freshOrder?.status ?? '') === 'review'
          ? '\u0420\u0430\u0431\u043e\u0442\u0430 \u043f\u0440\u0438\u043d\u044f\u0442\u0430. \u0412\u044b \u0441\u043c\u043e\u0436\u0435\u0442\u0435 \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432 \u043f\u043e\u0437\u0436\u0435.'
          : '\u0417\u0430\u043a\u0430\u0437 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d. \u041e\u0442\u0437\u044b\u0432 \u043c\u043e\u0436\u043d\u043e \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435.'
      );
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.response?.data?.error || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u0438\u043d\u044f\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443');
    } finally {
      setReviewSubmitting(false);
      setReviewActionLoading(null);
    }
  }, [orderId, refreshOrderWithLists, userProfile?.id]);

  const handleConfirmRevisionFromCard = useCallback(async () => {
    if (!orderId) return;
    const comment = revisionComment.trim();
    if (!comment) {
      message.warning('\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u0434\u043b\u044f \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0438');
      return;
    }
    try {
      setRevisionSubmitting(true);
      setReviewActionLoading('revision');
      await ordersApi.requestRevision(Number(orderId), comment);
      await refreshOrderWithLists();
      setRevisionModalOpen(false);
      setRevisionComment('');
      message.success('\u0417\u0430\u043f\u0440\u043e\u0441 \u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0443 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441 \u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0443');
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
      message.success('\u0420\u0430\u0431\u043e\u0442\u0430 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u0430');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443');
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
      message.success(`\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044e ${expertUsername} \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043f\u0440\u0438\u043d\u044f\u0442\u044c \u0437\u0430\u043a\u0430\u0437`);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044e');
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
      message.success('\u0417\u0430\u043a\u0430\u0437 \u043f\u0440\u0438\u043d\u044f\u0442 \u0432 \u0440\u0430\u0431\u043e\u0442\u0443');
      if (response?.chat_id && order.expert?.id) {
        setTimeout(() => {
          dashboard.openOrderChat(Number(orderId), order.expert!.id, response.chat_id);
        }, 300);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u0438\u043d\u044f\u0442\u044c \u0437\u0430\u043a\u0430\u0437');
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
      message.success('\u041f\u0440\u0438\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0437\u0430\u043a\u0430\u0437 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u043b\u043e\u043d\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437');
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
          description: '\u0413\u043e\u0442\u043e\u0432\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u0430 \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u043c',
        })
      );
      await Promise.all(uploadPromises);
      await ordersApi.submitOrder(Number(orderId));
      await refreshOrderWithLists();
      message.success(files.length > 1 ? '\u0420\u0430\u0431\u043e\u0442\u044b \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u044b \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443' : '\u0420\u0430\u0431\u043e\u0442\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430 \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435 \u0444\u0430\u0439\u043b\u043e\u0432');
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
            description: '\u0424\u0430\u0439\u043b \u0437\u0430\u0434\u0430\u043d\u0438\u044f',
          })
        )
      );
      await refreshOrderWithLists();
      message.success(files.length > 1 ? '\u0424\u0430\u0439\u043b\u044b \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u044b' : '\u0424\u0430\u0439\u043b \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u0430\u0439\u043b \u0437\u0430\u0434\u0430\u043d\u0438\u044f');
    } finally {
      setUploadingFiles(false);
    }
  }, [orderId, refreshOrderWithLists]);

  const handleDownloadFile = useCallback(async (file: any): Promise<boolean> => {
    try {
      const orderIdNum = Number(orderId);
      const fileIdNum = Number(file?.id);
      const filename = file?.filename || file?.file_name || 'file';
      if (!orderIdNum || Number.isNaN(orderIdNum) || !fileIdNum || Number.isNaN(fileIdNum)) {
        message.error('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b');
        return false;
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
      return true;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        message.error('\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044f \u0444\u0430\u0439\u043b\u0430');
      } else {
        message.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0438 \u0444\u0430\u0439\u043b\u0430');
      }
      return false;
    }
  }, [orderId]);

  const handleDeleteOrderFile = useCallback((file: any) => {
    if (!orderId || !file?.id) return;
    const filename = file?.filename || file?.file_name || '\u0424\u0430\u0439\u043b';
    Modal.confirm({
      title: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0444\u0430\u0439\u043b?',
      content: `\u0424\u0430\u0439\u043b "${filename}" \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043b\u0435\u043d \u0438\u0437 \u0437\u0430\u043a\u0430\u0437\u0430.`,
      okText: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c',
      cancelText: '\u041e\u0442\u043c\u0435\u043d\u0430',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ordersApi.deleteOrderFile(Number(orderId), Number(file.id));
          await refreshOrderWithLists();
          message.success('\u0424\u0430\u0439\u043b \u0443\u0434\u0430\u043b\u0435\u043d');
        } catch (e: any) {
          message.error(e?.response?.data?.detail || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0444\u0430\u0439\u043b');
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
