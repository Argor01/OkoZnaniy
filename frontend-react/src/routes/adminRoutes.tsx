import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin'));
const TicketDetailPage = lazy(() => import('@/features/admin/pages/TicketDetailPage'));
const ArbitrationDetailPage = lazy(() => import('@/features/admin/pages/ArbitrationDetailPage'));
const ArbitrationCaseDetailPage = lazy(() => import('@/features/admin/pages/ArbitrationCaseDetailPage'));

export const adminRoutes = (
  <>
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
    <Route
      path="/admin/arbitration/case/:caseNumber"
      element={<ArbitrationCaseDetailPage />}
    />
    <Route
      path="/admin/arbitration/:ticketId"
      element={<ArbitrationDetailPage />}
    />
  </>
);
