import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const DirectorDashboard = lazy(() => import('@/features/director/pages/DirectorDashboard'));
const MyDisputes = lazy(() => import('@/features/arbitration/pages/MyDisputes'));

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
      path={ROUTES.arbitrator.root}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <MyDisputes />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
