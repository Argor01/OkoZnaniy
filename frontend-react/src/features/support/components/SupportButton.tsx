import React from 'react';
import { Button } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import '@/styles/support.css';

interface SupportButtonProps {
  type?: 'float' | 'button';
}

const SupportButton: React.FC<SupportButtonProps> = ({ type = 'float' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shouldShow, setShouldShow] = React.useState<boolean | null>(null);

  const token = localStorage.getItem('access_token');
  const excludedPaths = ['/', '/home', '/login', '/register'];
  const isExcludedPath = excludedPaths.includes(location.pathname);

  React.useEffect(() => {
    if (isExcludedPath || !token) {
      setShouldShow(false);
      return;
    }

    const userRole = localStorage.getItem('user_role');
    if (userRole === 'admin' || userRole === 'director') {
      setShouldShow(false);
      return;
    }

    setShouldShow(true);
  }, [isExcludedPath, token]);

  if (shouldShow === null || !shouldShow) {
    return null;
  }

  const handleSupportClick = () => {
    navigate('/support/claim-form?mode=support');
  };

  if (type === 'float') {
    return (
      <div className="supportButtonFloatWrapper">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<CustomerServiceOutlined />}
          onClick={handleSupportClick}
          className="supportButtonFloat"
          title="Техническая поддержка"
        />
      </div>
    );
  }

  return (
    <Button
      type="default"
      icon={<CustomerServiceOutlined />}
      onClick={handleSupportClick}
    >
      Поддержка
    </Button>
  );
};

export default SupportButton;
