import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { DashboardRedirect } from '@/features/auth/components/DashboardRedirect';
import { ROUTES } from '@/utils/constants';

import { authRoutes } from './authRoutes';
import { adminRoutes } from './adminRoutes';
import { directorRoutes } from './directorRoutes';
import { expertRoutes } from './expertRoutes';
import { orderRoutes } from './orderRoutes';
import { partnerRoutes } from './partnerRoutes';
import { shopRoutes } from './shopRoutes';
import { supportRoutes } from './supportRoutes';
import { knowledgeRoutes } from './knowledgeRoutes';

const ImprovementsSurveyPage = lazy(() => import('@/features/improvements/pages/ImprovementsSurveyPage'));
const NotFound = lazy(() => import('@/features/common/pages/NotFound'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {authRoutes}

      <Route path={ROUTES.dashboard} element={<DashboardRedirect />} />

      {expertRoutes}
      {orderRoutes}
      {partnerRoutes}

      {/* Admin Routes */}
      {adminRoutes}
      {directorRoutes}

      {/* Shop Routes */}
      {shopRoutes}

      <Route
        path={ROUTES.improvements.survey}
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ImprovementsSurveyPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Support Routes */}
      {supportRoutes}

      {/* Knowledge Routes */}
      {knowledgeRoutes}

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
