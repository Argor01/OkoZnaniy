import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import './styles/partner-pages.css';
import './styles/globals.css';
import './styles/colors.css';
import './styles/typography.css';
import './styles/spacing.css';
import './styles/tokens.css';
import './styles/components.css';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import CreateOrder from './pages/CreateOrder';
import ClientDashboard from './pages/ClientDashboard';
import ExpertDashboard from './pages/ExpertDashboard';
import ExpertProfile from './pages/ExpertProfile';
import PartnerDashboard from './pages/PartnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ArbitratorDashboard from './pages/ArbitratorDashboard';
import BecomeExpert from './pages/BecomeExpert';
import BecomePartner from './pages/BecomePartner';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

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
          <ScrollToTop />
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/become-expert" element={<BecomeExpert />} />
              <Route path="/become-partner" element={<BecomePartner />} />
              <Route 
                path="/create-order" 
                element={
                  <ProtectedRoute>
                    <CreateOrder />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
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
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/arbitrator" 
                element={
                  <ProtectedRoute>
                    <ArbitratorDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;