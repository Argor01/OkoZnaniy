import React from 'react';
import { Menu, Button } from 'antd';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import {
  HomeOutlined,
  FileTextOutlined,
  TagOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

export const Navigation: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Главная',
    },
    {
      key: '/orders',
      icon: <FileTextOutlined />,
      label: 'Мои заказы',
    },
    {
      key: '/discounts',
      icon: <TagOutlined />,
      label: 'Скидки',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Профиль',
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="navigation">
      <Menu
        mode="horizontal"
        selectedKeys={[router.pathname]}
        items={menuItems}
        onClick={({ key }) => router.push(key)}
      />
      <Button
        type="text"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        className="logout-button"
      >
        Выйти
      </Button>

      <style jsx>{`
        .navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        :global(.logout-button) {
          margin-left: 16px;
        }
      `}</style>
    </div>
  );
}; 