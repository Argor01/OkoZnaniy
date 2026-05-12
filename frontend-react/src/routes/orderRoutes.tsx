import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const CreateOrder = lazy(() => import('@/features/orders/pages/CreateOrder'));
const OrderDetail = lazy(() => import('@/features/orders/pages/OrderDetail'));
const ComplaintForm = lazy(() => import('@/features/orders/pages/ComplaintForm'));
const ComplaintDetails = lazy(() => import('@/features/arbitration/pages/ComplaintDetails'));
const MyWorks = lazy(() => import('@/features/orders/pages/MyWorks'));
const ExpertClientOrders = lazy(() => import('@/features/orders/pages/ExpertClientOrders'));
const OrdersFeed = lazy(() => import('@/features/orders/pages/OrdersFeed'));

export const orderRoutes = (
  <>
    <Route
      path={ROUTES.createOrder}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <CreateOrder />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.orders.detail}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <OrderDetail />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/orders/:orderId/complaint"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ComplaintForm />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/arbitration/complaint/:complaintId"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ComplaintDetails />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.works.list}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <MyWorks />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.expert.clientOrders}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ExpertClientOrders />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.orders.feed}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <OrdersFeed />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
