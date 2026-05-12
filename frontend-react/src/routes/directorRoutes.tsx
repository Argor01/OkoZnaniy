import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const DirectorDashboard = lazy(() => import('@/features/director/pages/DirectorDashboard'));
const ArbitratorDashboard = lazy(() => import('@/features/arbitration/pages/ArbitratorDashboard'));

export const directorRoutes = (
  <>
    <Route
      path={ROUTES.admin.directorDashboard}
      element={
        <ProtectedRoute>
          <DirectorDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/arbitrator"
      element={
        <ProtectedRoute>
          <ArbitratorDashboard />
        </ProtectedRoute>
      }
    />
  </>
);
