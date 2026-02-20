import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ConfigProvider, Spin } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import './utils/clearAuth'; 


import './styles/page-transitions.css';
import './styles/landing.css';
import './styles/logo.css';
import './styles/expert-partner-pages.css';
import './styles/expert-advantages.css';
import './styles/expert-form.css';
import './styles/feedback-form.css';
import './styles/partner-pages.css';
import './styles/globals.css';
import './styles/typography.css';
import './styles/spacing.css';
import './styles/tokens.css';
import './styles/components.css';
import './styles/messages.css';
import './styles/modals.css';
import './styles/modals-centered.css';
import './styles/avatar.css';

// Import pages
import OrderDetail from './pages/OrderDetail';
import WorkDetail from './pages/WorkDetail';
import ShopWorkDetail from './pages/ShopWorkDetail';
import UserProfile from './pages/UserProfile';
import Home from './pages/Home';
import Login from './pages/Login';
import GoogleCallback from './pages/GoogleCallback';
import CreateOrder from './pages/CreateOrder';
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertApplication from './pages/ExpertApplication';
import BecomeExpert from './pages/BecomeExpert';
import BecomePartner from './pages/BecomePartner';
import PartnerDashboard from './pages/PartnerDashboard';
import AdminDashboard from './pages/AdminDashboard/index';
import AdminLogin from './components/admin/AdminLogin';
import DirectorDashboard from './pages/DirectorDashboard/DirectorDashboard';
import ShopReadyWorks from './pages/ShopReadyWorks';
import AddWorkToShop from './pages/AddWorkToShop';
import MyWorks from './pages/MyWorks';
import PurchasedWorks from './pages/PurchasedWorks';
import OrdersFeed from './pages/OrdersFeed';
import SupportChat from './pages/SupportChat';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import SupportButton from './components/SupportButton';
import { authApi } from './api/auth';
import { ROUTES } from './utils/constants';

// Configure dayjs
dayjs.locale('ru');

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardRedirect: React.FC = () => {
  const token = localStorage.getItem('access_token');

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!token,
  });

  if (!token) return <Navigate to={ROUTES.login} replace />;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const role = userProfile?.role ?? '';

  if (role === 'partner') return <Navigate to={ROUTES.partner.root} replace />;
  if (role === 'admin') return <Navigate to={ROUTES.admin.dashboard} replace />;
  if (role === 'director') return <Navigate to={ROUTES.admin.directorDashboard} replace />;
  if (role === 'arbitrator') return <Navigate to={ROUTES.arbitrator.root} replace />;

  return <Navigate to={ROUTES.expert.root} replace />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider 
        locale={ruRU}
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <Router>
          <div className="App">
            <Routes>
              <Route path={ROUTES.home} element={<Home />} />
              <Route path={ROUTES.login} element={<Login />} />
              <Route path={ROUTES.auth.googleCallback} element={<GoogleCallback />} />
              <Route path={ROUTES.auth.googleCallbackLegacy} element={<GoogleCallback />} />
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
              {/* Admin login page with quick links */}
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
              {/* Admin dashboard */}
              <Route 
                path={ROUTES.admin.dashboard} 
                element={<AdminDashboard />} 
              />
              {/* Director dashboard */}
              <Route 
                path={ROUTES.admin.directorDashboard}
                element={
                  <ProtectedRoute>
                    <DirectorDashboard />
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
              <Route 
                path={ROUTES.supportChat.detail}
                element={
                  <ProtectedRoute>
                    <SupportChat />
                  </ProtectedRoute>
                } 
              />
              {/* 404 - должен быть последним */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SupportButton />
          </div>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
