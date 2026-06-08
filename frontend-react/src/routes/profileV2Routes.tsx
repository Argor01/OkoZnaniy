import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';

const ProfileV2 = lazy(() => import('@/features/profile-v2/pages/ProfileV2'));

const wrap = (el: React.ReactNode) => (
  <ProtectedRoute>
    <DashboardLayout>{el}</DashboardLayout>
  </ProtectedRoute>
);

export const profileV2Routes = (
  <>
    <Route path="/lk_v2" element={wrap(<ProfileV2 />)} />
    <Route path="/lk_v2/:username" element={wrap(<ProfileV2 />)} />
  </>
);
