import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const ShopReadyWorks = lazy(() => import('@/features/shop/pages/ShopReadyWorks'));
const AddWorkToShop = lazy(() => import('@/features/shop/pages/AddWorkToShop'));
const ShopWorkDetail = lazy(() => import('@/features/shop/pages/ShopWorkDetail'));
const PurchasedWorks = lazy(() => import('@/features/shop/pages/PurchasedWorks'));

export const shopRoutes = (
  <>
    <Route
      path={ROUTES.shop.workDetail}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ShopWorkDetail />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.shop.readyWorks}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <ShopReadyWorks />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.shop.addWork}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <AddWorkToShop />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.shop.purchased}
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <PurchasedWorks />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
