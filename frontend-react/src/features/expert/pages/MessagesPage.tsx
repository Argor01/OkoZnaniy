import React, { useEffect, useMemo } from 'react';
import { Spin } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth';
import MessageModalNew from '@/features/expert/modals/MessageModalNew';
import { BREAKPOINTS, ROUTES } from '@/utils/constants';
import { CURRENT_USER_KEY } from '@/hooks/queries';

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: userProfile, isLoading } = useQuery({
    queryKey: [...CURRENT_USER_KEY],
    queryFn: () => authApi.getCurrentUser(),
  });

  const viewport = useMemo(() => {
    const width = window.innerWidth;
    return {
      isMobile: width <= 840,
      isTablet: width > 840 && width <= BREAKPOINTS.TABLET,
      isDesktop: width > BREAKPOINTS.TABLET,
    };
  }, []);

  const selectedUserId = (() => {
    const value = Number(searchParams.get('userId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  })();

  const selectedOrderId = (() => {
    const value = Number(searchParams.get('orderId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  })();

  const chatId = (() => {
    const value = Number(searchParams.get('chatId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  })();

  const chatContextTitle = searchParams.get('title') || undefined;
  const openSupportCenter = searchParams.get('support') === '1';

  useEffect(() => {
    if (!openSupportCenter && !chatId) return;

    const timeout = window.setTimeout(() => {
      if (openSupportCenter) {
        window.dispatchEvent(new CustomEvent('openSupportCenter'));
      }
      if (chatId || selectedUserId) {
        window.dispatchEvent(new CustomEvent('messageModalOpenChatById', {
          detail: { chatId, userId: selectedUserId }
        }));
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [chatId, openSupportCenter, selectedUserId]);

  const handleClose = () => {
    const from = typeof location.state === 'object' && location.state && 'from' in location.state
      ? (location.state as { from?: string }).from
      : undefined;

    if (from) {
      navigate(from);
      return;
    }

    navigate(userProfile?.role === 'expert' ? ROUTES.expert.root : ROUTES.orders.feed);
  };

  if (isLoading || !userProfile) {
    return <Spin size="large" fullscreen />;
  }

  return (
    <MessageModalNew
      visible
      onClose={handleClose}
      isMobile={viewport.isMobile}
      isTablet={viewport.isTablet}
      isDesktop={viewport.isDesktop}
      selectedUserId={selectedUserId}
      selectedOrderId={selectedOrderId}
      chatContextTitle={chatContextTitle}
      userProfile={userProfile}
      renderAsPage
    />
  );
};

export default MessagesPage;
