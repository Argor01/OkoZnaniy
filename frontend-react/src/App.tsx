import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import './utils/clearAuth'; 
import './styles/globals.css';

import { SupportButton } from '@/features/support';
import { AppRoutes } from '@/routes/AppRoutes';
import { CookieConsent } from '@/components/ui';
import { ScrollToTop } from '@/features/common';

dayjs.locale('ru');

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
      <ConfigProvider 
        locale={ruRU}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            fontFamily: 'Jost-Regular, system-ui, Avenir, Helvetica, Arial, sans-serif',
          },
          components: {
            Typography: {
              fontFamilyCode: 'Jost-SemiBold, sans-serif',
            }
          }
        }}
      >
        <AntApp>
          <Router>
            <ScrollToTop />
            <Suspense fallback={
              <div className="fullScreenCenter">
                <Spin size="large" />
              </div>
            }>
              <div className="App">
                <AppRoutes />
                <SupportButton />
                <CookieConsent />
              </div>
            </Suspense>
          </Router>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
