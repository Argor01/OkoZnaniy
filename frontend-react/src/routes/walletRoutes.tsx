import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';

const Wallet = lazy(() => import('@/features/wallet/pages/Wallet'));

export const walletRoutes = (
  <>
    <Route
      path="/wallet"
      element={
        <ProtectedRoute>
          <DashboardLayout>
            <Wallet />
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
  </>
);
