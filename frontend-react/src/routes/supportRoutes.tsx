import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const SupportChat = lazy(() => import('@/features/support/pages/SupportChat'));
const ClaimForm = lazy(() => import('@/features/support/pages/ClaimForm'));
const SupportCenterPage = lazy(() => import('@/features/support/pages/SupportCenterPage'));

export const supportRoutes = (
  <>
    <Route
      path={ROUTES.supportChat.root}
      element={
        <ProtectedRoute>
          <SupportCenterPage />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.supportChat.detail}
      element={
        <ProtectedRoute>
          <SupportChat />
        </ProtectedRoute>
      }
    />
    <Route
      path="/support/claim-form"
      element={
        <ProtectedRoute>
          <ClaimForm />
        </ProtectedRoute>
      }
    />
  </>
);
