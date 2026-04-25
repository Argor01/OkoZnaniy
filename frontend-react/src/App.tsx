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
      // #15: «не всё автоматически обновляется» — включаем обновление при
      // возврате во вкладку и при повторном монтировании компонента.
      // react-query всё равно держит кэш, так что дополнительные запросы
      // идут только после дедупликации.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      staleTime: 30_000,
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
            colorPrimary: '#2b9fe6',
            colorInfo: '#2b9fe6',
            colorLink: '#0f7fda',
            colorWarning: '#ffa831',
            colorBgLayout: '#ffffff',
            fontFamily: 'Jost-Regular, system-ui, Avenir, Helvetica, Arial, sans-serif',
            fontSize: 15,
            fontSizeHeading1: 32,
            fontSizeHeading2: 26,
            fontSizeHeading3: 22,
            fontSizeHeading4: 18,
            fontSizeHeading5: 16,
            borderRadius: 10,
          },
          components: {
            Typography: {
              fontFamilyCode: 'Jost-SemiBold, sans-serif',
            },
            Button: {
              fontWeight: 500,
              controlHeight: 38,
            },
            Input: {
              controlHeight: 38,
            },
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
