import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/layout';
import { ProtectedRoute } from '@/features/auth';
import { DashboardRedirect } from '@/features/auth/components/DashboardRedirect';
import { ROUTES } from '@/utils/constants';

const OrderDetail = lazy(() => import('@/features/orders/pages/OrderDetail'));
const WorkDetail = lazy(() => import('@/features/orders/pages/WorkDetail'));
const ShopWorkDetail = lazy(() => import('@/features/shop/pages/ShopWorkDetail'));
const UserProfile = lazy(() => import('@/features/user/pages/UserProfile'));
const Home = lazy(() => import('@/features/home/pages/Home'));
const Login = lazy(() => import('@/features/auth/pages/Login'));
const GoogleCallback = lazy(() => import('@/features/auth/pages/GoogleCallback'));
const CreateOrder = lazy(() => import('@/features/orders/pages/CreateOrder'));
const ExpertDashboard = lazy(() => import('@/features/expert/pages/ExpertDashboard'));
const ExpertApplication = lazy(() => import('@/features/expert/pages/ExpertApplication'));
const BecomeExpert = lazy(() => import('@/features/expert/pages/BecomeExpert'));
const BecomePartner = lazy(() => import('@/features/partner/pages/BecomePartner'));
const PartnerDashboard = lazy(() => import('@/features/partner/pages/PartnerDashboard'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminLogin = lazy(() => import('@/features/admin/pages/AdminLogin'));
const TicketDetailPage = lazy(() => import('@/features/admin/pages/TicketDetailPage'));
const DirectorDashboard = lazy(() => import('@/features/director/pages/DirectorDashboard'));
const ArbitratorDashboard = lazy(() => import('@/features/arbitrator/pages/ArbitratorDashboard'));
const ShopReadyWorks = lazy(() => import('@/features/shop/pages/ShopReadyWorks'));
const AddWorkToShop = lazy(() => import('@/features/shop/pages/AddWorkToShop'));
const MyWorks = lazy(() => import('@/features/orders/pages/MyWorks'));
const PurchasedWorks = lazy(() => import('@/features/shop/pages/PurchasedWorks'));
const OrdersFeed = lazy(() => import('@/features/orders/pages/OrdersFeed'));
const SupportChat = lazy(() => import('@/features/support/pages/SupportChat'));
const NotFound = lazy(() => import('@/features/common/pages/NotFound'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<Home />} />
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.auth.googleCallback} element={<GoogleCallback />} />
      <Route path={ROUTES.auth.googleCallbackLegacy} element={<GoogleCallback />} />
      
      {/* Protected Routes */}
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
        path={ROUTES.works.detail} 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WorkDetail />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
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
        path={ROUTES.dashboard} 
        element={<DashboardRedirect />} 
      />
      <Route 
        path={ROUTES.expert.root} 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ExpertDashboard/>
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
        path={ROUTES.becomeExpert} 
        element={<BecomeExpert />} 
      />
      <Route 
        path={ROUTES.becomePartner} 
        element={<BecomePartner />} 
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
      <Route 
        path={ROUTES.partner.root} 
        element={
          <ProtectedRoute>
            <PartnerDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Routes */}
      <Route 
        path={ROUTES.admin.root} 
        element={<AdminLogin />} 
      />
      <Route
        path={ROUTES.admin.login}
        element={<Navigate to={ROUTES.admin.root} replace />}
      />
      <Route
        path={ROUTES.admin.directorLogin}
        element={<Navigate to={ROUTES.admin.root} replace />}
      />
      <Route 
        path={ROUTES.admin.dashboard} 
        element={<AdminDashboard />} 
      />
      <Route 
        path="/admin/tickets/:ticketId"
        element={<TicketDetailPage />} 
      />
      <Route 
        path={ROUTES.admin.directorDashboard}
        element={
          <ProtectedRoute>
            <DirectorDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Shop Routes */}
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
        path={ROUTES.orders.feed}
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <OrdersFeed />
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
      
      {/* Support Routes */}
      <Route 
        path={ROUTES.supportChat.detail}
        element={
          <ProtectedRoute>
            <SupportChat />
          </ProtectedRoute>
        } 
      />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
