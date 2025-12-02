import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

// Import styles
import './styles/page-transitions.css';
import './styles/landing.css';
import './styles/logo.css';
import './styles/expert-partner-pages.css';
import './styles/expert-advantages.css';
import './styles/expert-form.css';
import './styles/feedback-form.css';
import './styles/partner-pages.css';
import './styles/globals.css';
import './styles/colors.css';
import './styles/typography.css';
import './styles/spacing.css';
import './styles/tokens.css';
import './styles/components.css';
import './styles/messages.css';
import './styles/modals.css';
import './styles/avatar.css';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import GoogleCallback from './pages/GoogleCallback';
import CreateOrder from './pages/CreateOrder';
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertProfile from './pages/ExpertProfile';
import ExpertApplication from './pages/ExpertApplication';
import BecomeExpert from './pages/BecomeExpert';
import BecomePartner from './pages/BecomePartner';
import PartnerDashboard from './pages/PartnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DirectorDashboard from './pages/DirectorDashboard/DirectorDashboard';
import ShopReadyWorks from './pages/ShopReadyWorks';
import AddWorkToShop from './pages/AddWorkToShop';
import MyWorks from './pages/MyWorks';
import PurchasedWorks from './pages/PurchasedWorks';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

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

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={ruRU}>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              <Route path="/google-callback" element={<GoogleCallback />} />
              <Route 
                path="/create-order" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CreateOrder />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={<Navigate to="/expert" replace />} 
              />
              <Route 
                path="/expert" 
                element={
                  <ProtectedRoute>
                    <ExpertDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/expert-application" 
                element={
                  <ProtectedRoute>
                    <ExpertApplication />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/become-expert" 
                element={<BecomeExpert />} 
              />
              <Route 
                path="/become-partner" 
                element={<BecomePartner />} 
              />
              <Route 
                path="/expert/:expertId" 
                element={<ExpertProfile />} 
              />
              <Route 
                path="/partner" 
                element={
                  <ProtectedRoute>
                    <PartnerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={<AdminDashboard />} 
              />
              <Route 
                path="/ADMIN" 
                element={<Navigate to="/admin" replace />} 
              />
              <Route 
                path="/administrator" 
                element={<Navigate to="/admin" replace />} 
              />
              <Route 
                path="/director"
                element={
                  <ProtectedRoute>
                    <DirectorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shop/ready-works"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ShopReadyWorks />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shop/add-work"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <AddWorkToShop />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/works"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <MyWorks />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/shop/purchased"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <PurchasedWorks />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              {/* 404 - должен быть последним */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
