import React from 'react';
import { Layout } from 'antd';
import { Navigation } from './Navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Layout>
      {user && (
        <Header style={{ padding: 0, background: '#fff' }}>
          <Navigation />
        </Header>
      )}
      <Content>
        <div className="content-container">{children}</div>
      </Content>

      <style jsx>{`
        .content-container {
          min-height: calc(100vh - ${user ? '64px' : '0px'});
          padding: 24px;
          background: #f0f2f5;
        }
      `}</style>
    </Layout>
  );
}; 