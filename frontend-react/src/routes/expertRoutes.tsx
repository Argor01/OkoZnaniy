import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const ExpertDashboard = lazy(() => import('@/features/expert/pages/ExpertDashboard'));
const ExpertApplication = lazy(() => import('@/features/expert/pages/ExpertApplication'));
const UserProfile = lazy(() => import('@/features/user/pages/UserProfile'));

export const expertRoutes = (
  <>
    <Route
      path={ROUTES.expert.root}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ExpertDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.expert.application}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ExpertApplication />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.expert.profile}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <UserProfile />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.user.profile}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <UserProfile />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
