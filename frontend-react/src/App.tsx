import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Spin, App as AntApp, theme as antTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import './utils/clearAuth'; 
import './styles/globals.css';

import { SupportButton } from '@/features/support';
import { AppRoutes } from '@/routes/AppRoutes';
import { CookieConsent } from '@/components/ui';
import { ScrollToTop } from '@/features/common';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/features/common/components/ErrorBoundary';

dayjs.locale('ru');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      staleTime: 30_000,
    },
  },
});

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider 
      locale={ruRU}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#6435a5',
          colorInfo: '#6435a5',
          colorLink: isDark ? '#a78bfa' : '#4e1f9e',
          colorWarning: '#ffa831',
          colorBgLayout: isDark ? '#0f1117' : '#ffffff',
          colorBgContainer: isDark ? '#1a1d27' : '#ffffff',
          colorBgElevated: isDark ? '#22262f' : '#ffffff',
          colorBorderSecondary: isDark ? '#2d3348' : '#f0f0f0',
          colorBorder: isDark ? '#2d3348' : '#d9d9d9',
          colorText: isDark ? '#cbd5e1' : '#1f2937',
          colorTextSecondary: isDark ? '#94a3b8' : '#6b7280',
          colorTextTertiary: isDark ? '#64748b' : '#9ca3af',
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
          Card: {
            colorBgContainer: isDark ? '#1a1d27' : '#ffffff',
          },
          Table: {
            colorBgContainer: isDark ? '#1a1d27' : '#ffffff',
            headerBg: isDark ? '#22262f' : '#fafafa',
          },
          Modal: {
            contentBg: isDark ? '#1a1d27' : '#ffffff',
            headerBg: isDark ? '#1a1d27' : '#ffffff',
          },
          Menu: {
            colorItemBg: 'transparent',
            colorSubItemBg: 'transparent',
            colorItemBgSelected: isDark ? '#2d1a5f' : '#f3e8ff',
            colorItemTextSelected: '#6435a5',
          },
          Dropdown: {
            colorBgElevated: isDark ? '#22262f' : '#ffffff',
          },
        },
      }}
    >
      <AntApp>
        <Router>
          <ScrollToTop />
          <ErrorBoundary>
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
          </ErrorBoundary>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
