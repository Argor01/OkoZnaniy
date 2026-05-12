import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { ROUTES } from '@/utils/constants';

const PartnerDashboard = lazy(() => import('@/features/partner/pages/PartnerDashboard'));

export const partnerRoutes = (
  <>
    <Route
      path={ROUTES.partner.root}
      element={
        <ProtectedRoute>
          <PartnerDashboard />
        </ProtectedRoute>
      }
    />
  </>
);
