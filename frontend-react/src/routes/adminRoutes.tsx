import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const ReviewsPage = lazy(() => import('@/features/admin/pages/ReviewsPage'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin'));
const TicketDetailPage = lazy(() => import('@/features/admin/pages/TicketDetailPage'));

export const adminRoutes = (
  <>
    <Route path="/admin/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
    <Route path={ROUTES.admin.root} element={<AdminLogin />} />
    <Route
      path={ROUTES.admin.login}
      element={<Navigate to={ROUTES.admin.root} replace />}
    />
    <Route path={ROUTES.admin.directorLogin} element={<AdminLogin />} />
    <Route
      path={ROUTES.admin.dashboard}
      element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />
    <Route path="/admin/tickets/:ticketId" element={<TicketDetailPage />} />
  </>
);
