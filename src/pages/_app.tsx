import React from 'react';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { store } from '@/store';
import { MainLayout } from '@/components/layout/MainLayout';

import 'antd/dist/reset.css';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <Provider store={store}>
      <ConfigProvider locale={ruRU}>
        <MainLayout>
          <Component {...pageProps} />
        </MainLayout>
      </ConfigProvider>
    </Provider>
  );
};

export default App; 